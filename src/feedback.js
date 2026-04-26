import { CAT_NAMES, UPPER_THRESHOLD, UPPER_BONUS } from './constants.js';
import { countsToValues } from './dice.js';

function listDice(arr) {
  if (arr.length === 1) return `${arr[0]}`;
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
}

function describeKeepTarget(keep, openMask) {
  const n = keep.reduce((a, b) => a + b, 0);
  if (n === 0) return 'rerolling everything';
  const maxCount = Math.max(...keep);
  const vals = countsToValues(keep);
  if (maxCount === 5) return `five ${vals[0]}s — YATZY`;
  if (maxCount === 4) return `four ${vals[0]}s`;
  if (maxCount === 3) {
    const tv = keep.findIndex(c => c === 3) + 1;
    const others = vals.filter(v => v !== tv);
    if (others.length === 2 && others[0] === others[1])
      return `full house (${tv}s over ${others[0]}s)`;
    return `three ${tv}s`;
  }
  const pairs = keep.reduce((acc, c, i) => { if (c >= 2) acc.push(i + 1); return acc; }, []);
  if (pairs.length === 2) return `two pair (${pairs[0]}s & ${pairs[1]}s)`;
  if (pairs.length === 1) {
    const face = pairs[0];
    const upperOpen   = openMask != null && !(openMask & (1 << (face - 1)));
    const onePaarOpen = openMask != null && !(openMask & (1 << 13));
    if (upperOpen || onePaarOpen || openMask == null) return `a pair of ${face}s`;
    const targets = [];
    if (!(openMask & (1 << 14))) targets.push('2 Paar');
    if (!(openMask & (1 << 6)))  targets.push('Drei Gleiche');
    if (!(openMask & (1 << 8)))  targets.push('Volles Haus');
    if (!(openMask & (1 << 7)))  targets.push('Vier Gleiche');
    if (!(openMask & (1 << 11))) targets.push('YATZY');
    return targets.length ? `${face}s — toward ${targets.slice(0, 2).join(' or ')}` : listDice(vals);
  }
  const uniq  = [...new Set(vals)].sort((a, b) => a - b);
  const isRun = uniq.every((v, i) => i === 0 || v === uniq[i - 1] + 1);
  if (isRun && uniq.length >= 2) {
    if (uniq.length >= 5) return `large straight (${uniq[0]}–${uniq[uniq.length - 1]})`;
    if (uniq.length >= 4) return `straight run (${uniq[0]}–${uniq[uniq.length - 1]})`;
    return `straight start (${uniq[0]}–${uniq[uniq.length - 1]}) toward Kleine/Grosse Strasse`;
  }
  if (vals.length === 1) return `the ${vals[0]}`;
  return listDice(vals);
}

export function buildKeepFeedback(correct, optKeep, userKeep, optEV, userEV, openMask) {
  const optVals  = countsToValues(optKeep);
  const userVals = countsToValues(userKeep);
  let tip = '';

  if (!correct) {
    const optN      = optKeep.reduce((a, b) => a + b, 0);
    const userN     = userKeep.reduce((a, b) => a + b, 0);
    const optTarget = describeKeepTarget(optKeep, openMask);
    const marginal  = (optEV - userEV) < 0.5
      ? ' (The difference is marginal — both choices are nearly equivalent here.)' : '';

    if (optN === 0) {
      tip = `None of these dice are worth holding — rerolling all five gives the best expected return from this position.${marginal}`;
    } else if (optN < userN) {
      const extras = [];
      for (let i = 0; i < 6; i++) for (let j = 0; j < userKeep[i] - optKeep[i]; j++) extras.push(i + 1);
      tip = `Release the ${listDice(extras)} — keeping only ${optTarget} leaves more dice in play and improves your odds at high-value hands.${marginal}`;
    } else if (optN > userN) {
      const more = [];
      for (let i = 0; i < 6; i++) for (let j = 0; j < optKeep[i] - userKeep[i]; j++) more.push(i + 1);
      tip = `Keep the ${listDice(more)} too — ${optTarget} is the strongest path from here.${marginal}`;
    } else {
      const out = [], inn = [];
      for (let i = 0; i < 6; i++) {
        const d = optKeep[i] - userKeep[i];
        if (d > 0) for (let j = 0; j < d; j++) inn.push(i + 1);
        if (d < 0) for (let j = 0; j < -d; j++) out.push(i + 1);
      }
      tip = `Swap the ${listDice(out)} for the ${listDice(inn)} — ${optTarget} is the higher-EV hand to build toward.${marginal}`;
    }
  }

  return { correct, type: 'keep', optVals, userVals, optEV, userEV, evDiff: +(optEV - userEV).toFixed(1), tip };
}

export function buildScoreFeedback(correct, optCat, userCat, optScore, userScore, optEV, userEV, openMask, upper) {
  let tip = '';

  if (!correct) {
    const optName     = CAT_NAMES[optCat];
    const userName    = CAT_NAMES[userCat];
    const evDiff      = (optEV - userEV).toFixed(1);
    const upperOpen   = [];
    for (let c = 0; c < 6; c++) if (!(openMask & (1 << c))) upperOpen.push(c);
    const upperNeeded = UPPER_THRESHOLD - upper;

    if (optCat < 6 && upper < UPPER_THRESHOLD) {
      const expected = (optCat + 1) * 3;
      if (optScore >= expected || upperOpen.length <= 3) {
        if (userCat === 12) {
          tip = `${optName} (${optScore} pts) keeps your bonus path alive — you're at ${upper}/${UPPER_THRESHOLD} and need ${upperNeeded} more for +${UPPER_BONUS}. Taking ${userName} here gives up upper progress and uses a flexible fallback slot that is often more valuable later.`;
        } else {
          tip = `${optName} (${optScore} pts) keeps your bonus path alive — you're at ${upper}/${UPPER_THRESHOLD} and need ${upperNeeded} more for +${UPPER_BONUS}. Taking ${userName} here gives up upper progress while the bonus is still live.`;
        }
      } else {
        tip = `${optName} contributes to the upper bonus (${upper}/${UPPER_THRESHOLD} toward +${UPPER_BONUS}). With ${upperOpen.length} upper slots remaining, the ${evDiff}-pt EV edge comes from keeping the bonus reachable.`;
      }
    } else if (optScore > userScore) {
      tip = `${optName} scores ${optScore - userScore} more points right now — take the larger immediate gain when it doesn't close off important future options.`;
    } else if (optScore < userScore) {
      const highValueMax = { 8: 25, 9: 30, 10: 40, 11: 50 };
      if (userCat in highValueMax) {
        tip = `${userName} can score ${highValueMax[userCat]} pts when you hit it fully — don't burn it for just ${userScore}. Score ${optName} now and save ${userName} for a proper roll.`;
      } else if (optScore === 0) {
        tip = `Scoring ${optName} as a zero clears the slot strategically — you won't roll better, and holding it open costs more than taking the zero now.`;
      } else {
        tip = `${optName} now (${optScore} pts) keeps higher-value categories open for the remaining turns. Using ${userName} here costs ${evDiff} in expected future score.`;
      }
    } else {
      tip = `${optName} and ${userName} score equally right now, but ${optName} leaves better future options open — a ${evDiff}-pt difference in expected score.`;
    }
  }

  return { correct, type: 'score', optCat, userCat, optScore, userScore, optEV, userEV, evDiff: +(optEV - userEV).toFixed(1), tip };
}
