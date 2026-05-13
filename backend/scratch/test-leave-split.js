const { calculateLeaveSplit } = require('../services/leaveService');

const scenarios = [
  {
    name: "Exact PL match",
    days: 2,
    balances: { casual: { balance: 0 }, sick: { balance: 0 }, privilege: { balance: 2 } },
    expected: { clUsed: 0, slUsed: 0, plUsed: 2, negativePL: 0, lopDays: 0 }
  },
  {
    name: "PL exceeds, goes negative",
    days: 3,
    balances: { casual: { balance: 0 }, sick: { balance: 0 }, privilege: { balance: 2 } },
    expected: { clUsed: 0, slUsed: 0, plUsed: 2, negativePL: 1, lopDays: 1 }
  },
  {
    name: "Priority: CL -> SL -> PL",
    days: 5,
    balances: { casual: { balance: 2 }, sick: { balance: 1 }, privilege: { balance: 10 } },
    expected: { clUsed: 2, slUsed: 1, plUsed: 2, negativePL: 0, lopDays: 0 }
  },
  {
    name: "Priority: All exhausted",
    days: 10,
    balances: { casual: { balance: 1 }, sick: { balance: 1 }, privilege: { balance: 1 } },
    expected: { clUsed: 1, slUsed: 1, plUsed: 1, negativePL: 7, lopDays: 7 }
  }
];

scenarios.forEach(s => {
  const result = calculateLeaveSplit(s.days, s.balances);
  console.log(`Scenario: ${s.name}`);
  console.log(`Requested: ${s.days}, Balances: CL=${s.balances.casual.balance}, SL=${s.balances.sick.balance}, PL=${s.balances.privilege.balance}`);
  console.log(`Result:   CL=${result.clUsed}, SL=${result.slUsed}, PL=${result.plUsed}, NegPL=${result.negativePL}, LOP=${result.lopDays}`);
  
  const ok = result.clUsed === s.expected.clUsed &&
             result.slUsed === s.expected.slUsed &&
             result.plUsed === s.expected.plUsed &&
             result.negativePL === s.expected.negativePL &&
             result.lopDays === s.expected.lopDays;
             
  console.log(ok ? "✅ PASS" : "❌ FAIL");
  console.log('-------------------');
});
