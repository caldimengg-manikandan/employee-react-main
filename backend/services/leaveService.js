
const LeaveLedger = require('../models/LeaveLedger');
const LeaveBalance = require('../models/LeaveBalance');
const Employee = require('../models/Employee');
const LeaveApplication = require('../models/LeaveApplication');

const monthsBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months -= start.getMonth();
  months += end.getMonth();
  
  // Adjusted to be Start-of-Month based (consistent with CL/SL and Frontend)
  // We no longer decrement based on day difference.
  // This ensures leave is credited as soon as the month starts.
  
  return Math.max(0, months);
};

const monthsBetweenRange = (startDate, endDate) => {
  return monthsBetween(startDate, endDate);
};

const toLower = (s) => {
  return String(s || '').toLowerCase();
};

const calcBalanceForEmployee = (emp, approvedLeaves = [], calculationDate = new Date()) => {
  const currentDate = new Date(calculationDate);
  const currentYear = currentDate.getFullYear();
  const position = emp.position || emp.role || '';
  const doj = emp.dateOfJoining || emp.hireDate || emp.createdAt;
  
  // For historical views, restrict to leaves started by calculationDate.
  // For current/future views, include all approved leaves in the provided set (already filtered by year in route).
  const isHistorical = currentDate < new Date().setHours(0,0,0,0);
  const filteredLeaves = approvedLeaves.filter(l => {
    if (isHistorical) return new Date(l.startDate) <= currentDate;
    return true;
  });

  // Use calculationDate for months of service
  const mos = monthsBetween(doj, currentDate);
  const isTrainee = toLower(position) === 'trainee' || toLower(position).includes('trainee');

  // Derive trainee months from previous organizations if present
  let traineeMonths = 0;
  if (Array.isArray(emp.previousOrganizations) && emp.previousOrganizations.length > 0) {
    const traineeOrg = emp.previousOrganizations.find((o) => toLower(o.position).includes('trainee'));
    if (traineeOrg && (traineeOrg.startDate || doj)) {
      const start = traineeOrg.startDate || doj;
      const end = traineeOrg.endDate || new Date();
      const totalMonths = monthsBetweenRange(start, end);
      traineeMonths = Math.min(12, totalMonths);
    }
  }
  if (isTrainee) {
    traineeMonths = Math.min(12, mos);
  }
  const postTraineeMonths = Math.max(0, mos - traineeMonths);

  let casual = 0, sick = 0;
  let usedCL = 0, usedSL = 0;
  
  // CL/SL Rule: After 6 months of regular service (post-trainee)?
  const afterSix = Math.max(postTraineeMonths - 6, 0);

  if (currentYear >= 2026) {
    // RESTART LOGIC FOR 2026 ONWARDS (Yearly Reset)
    const yearStart = new Date(currentYear, 0, 1);
    const dojDate = new Date(doj);

    if (dojDate < yearStart) {
      // Joined before current year
      // Check if they have completed 6 months service
      if (afterSix > 0) {
        // Accrue based on months passed in CURRENT YEAR
        // (currentMonth + 1) gives credit for current month
        const monthsInYear = currentDate.getMonth() + 1;
        casual = monthsInYear * 0.5;
        sick = monthsInYear * 0.5;
      } else {
        // Still in probation
        casual = 0;
        sick = 0;
      }
    } else {
      // Joined in current year
      // Use standard accumulation logic (0 for first 6 months, then 0.5/month)
      casual = afterSix * 0.5;
      sick = afterSix * 0.5;
    }

    // Filter usage for CURRENT YEAR only
    usedCL = filteredLeaves
      .reduce((sum, l) => {
        if (new Date(l.startDate).getFullYear() !== currentYear) return sum;
        if (l.clUsed !== undefined) return sum + (Number(l.clUsed) || 0);
        return sum + (l.leaveType === 'CL' ? (Number(l.totalDays) || 0) : 0);
      }, 0);

    usedSL = filteredLeaves
      .reduce((sum, l) => {
        if (new Date(l.startDate).getFullYear() !== currentYear) return sum;
        if (l.slUsed !== undefined) return sum + (Number(l.slUsed) || 0);
        return sum + (l.leaveType === 'SL' ? (Number(l.totalDays) || 0) : 0);
      }, 0);

  } else {
    // OLD CUMULATIVE LOGIC (Pre-2026)
    casual += afterSix * 0.5;
    sick += afterSix * 0.5;

    filteredLeaves.forEach(l => {
      if (l.clUsed !== undefined || l.slUsed !== undefined || l.plUsed !== undefined) {
        usedCL += (Number(l.clUsed) || 0);
        usedSL += (Number(l.slUsed) || 0);
      } else {
        if (l.leaveType === 'CL') usedCL += (Number(l.totalDays) || 0);
        else if (l.leaveType === 'SL') usedSL += (Number(l.totalDays) || 0);
      }
    });
  }

  const allocated = {
    casual: casual,
    sick: sick,
    privilege: 0
  };

  // PL Logic
  let plAllocated = 0;
  let plUsed = 0;
  let plBalance = 0;
  
  const dojDate = new Date(doj);
  const sixMonthThreshold = new Date(dojDate);
  sixMonthThreshold.setMonth(sixMonthThreshold.getMonth() + 6);
  
  if (isTrainee) {
      // Rule 1: Trainee Designation
      // Monthly Leave Credit: 1 day (PL)
      // Carry Forward: Not Allowed (Expires monthly)
      plAllocated = 1;
      
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      plUsed = filteredLeaves
          .filter(l => {
              const d = new Date(l.startDate);
              return d >= currentMonthStart && d <= currentMonthEnd;
          })
          .reduce((sum, l) => {
            if (l.plUsed !== undefined) {
              return sum + (Number(l.plUsed) || 0) + (Number(l.negativePL) || 0);
            }
            return sum + (l.leaveType === 'PL' ? (Number(l.totalDays) || 0) : 0);
          }, 0);
           
       plBalance = plAllocated - plUsed;
      } else {
          // Rule 2: Other Designations
          if (currentDate < sixMonthThreshold) {
              // First 6 months: No Carry Forward (Expires monthly)
              plAllocated = 1; // Assuming 1 day monthly credit for first 6 months
              
              const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
              
              plUsed = filteredLeaves
                  .filter(l => {
                      const d = new Date(l.startDate);
                      return d >= currentMonthStart && d <= currentMonthEnd;
                  })
                   .reduce((sum, l) => {
                     if (l.plUsed !== undefined) {
                       return sum + (Number(l.plUsed) || 0) + (Number(l.negativePL) || 0);
                     }
                     return sum + (l.leaveType === 'PL' ? (Number(l.totalDays) || 0) : 0);
                   }, 0);
                   
               plBalance = plAllocated - plUsed;
          } else {
              // After 6 months: Carry Forward Allowed
              // Add 1 to include the current month in accrual
              const monthsAfterThreshold = monthsBetweenRange(sixMonthThreshold, currentDate) + 1;
              plAllocated = monthsAfterThreshold * 1.25;
              
              plUsed = filteredLeaves
                  .filter(l => new Date(l.startDate) >= sixMonthThreshold)
                  .reduce((sum, l) => {
                    if (l.plUsed !== undefined) {
                      return sum + (Number(l.plUsed) || 0) + (Number(l.negativePL) || 0);
                    }
                    return sum + (l.leaveType === 'PL' ? (Number(l.totalDays) || 0) : 0);
                  }, 0);
               
               plBalance = plAllocated - plUsed;
          }
      }
   
   allocated.privilege = plAllocated;
   
   const balance = {
     casual: (allocated.casual - usedCL),
     sick: (allocated.sick - usedSL),
     privilege: plBalance
   };
   const totalBalance = (balance.casual + balance.sick + balance.privilege);

  return {
    employeeId: emp.employeeId || '',
    name: emp.name || emp.employeename || '',
    position: emp.position || emp.role || '',
    division: emp.division || '',
    location: emp.location || emp.branch || '',
    monthsOfService: mos,
    traineeMonths,
    regularMonths: postTraineeMonths,
    balances: {
      casual: { allocated: allocated.casual, used: usedCL, balance: balance.casual },
      sick: { allocated: allocated.sick, used: usedSL, balance: balance.sick },
      privilege: { 
        allocated: allocated.privilege, 
        used: plUsed, 
        balance: balance.privilege,
        nonCarryAllocated: 0,
        carryAllocated: allocated.privilege,
        carryForwardEligibleBalance: balance.privilege
      },
      isMonthlyExpiry: (postTraineeMonths || 0) < 6,
      totalBalance
    }
  };
};

const mergeBalances = (storedBalances, systemCalc, pastSystemCalc) => {
  const mergedBalances = JSON.parse(JSON.stringify(storedBalances));
  
  ['casual', 'sick', 'privilege'].forEach(type => {
      if (mergedBalances[type]) {
          let allocated = Number(mergedBalances[type].allocated) || 0;
          
          // Calculate incremental accrual since last update
          const currentAlloc = Number(systemCalc.balances[type]?.allocated) || 0;
          const pastAlloc = Number(pastSystemCalc.balances[type]?.allocated) || 0;
          
          // We add the difference between current system alloc and past system alloc
          // This preserves any manual adjustments (stored.allocated) while adding new accruals
          const delta = currentAlloc - pastAlloc;
          
          if (Math.abs(delta) > 0.001) {
              allocated += delta;
          }

          // Use system calculated 'used' which is based on actual approved leaves
          const used = Number(systemCalc.balances[type]?.used) || 0;
          
          mergedBalances[type].allocated = allocated;
          mergedBalances[type].used = used;
          mergedBalances[type].balance = allocated - used;
      }
  });
  
  const clBal = Number(mergedBalances.casual?.balance) || 0;
  const slBal = Number(mergedBalances.sick?.balance) || 0;
  const plBal = Number(mergedBalances.privilege?.balance) || 0;
  mergedBalances.totalBalance = clBal + slBal + plBal;
  
  // Ensure isMonthlyExpiry flag is passed
  if (systemCalc.balances && systemCalc.balances.isMonthlyExpiry !== undefined) {
      mergedBalances.isMonthlyExpiry = systemCalc.balances.isMonthlyExpiry;
  }

  return mergedBalances;
};

const recordTransaction = async (data) => {
  try {
    const { employeeId, leaveType, transactionType, days, month, year, remarks } = data;
    
    // Check for duplicate credit to prevent double allocation
    if (transactionType === 'Credit') {
      const existing = await LeaveLedger.findOne({ employeeId, leaveType, month, year, transactionType: 'Credit' });
      if (existing) {
        console.log(`Skipping duplicate credit for ${employeeId} - ${leaveType} (${month}/${year})`);
        return null;
      }
    }

    const ledgerEntry = new LeaveLedger({
      employeeId,
      leaveType,
      transactionType,
      days,
      month,
      year,
      remarks,
      transactionDate: new Date()
    });
    return await ledgerEntry.save();
  } catch (err) {
    console.error('Error recording transaction:', err);
    throw err;
  }
};

const runMonthlyAllocation = async (targetDate = new Date()) => {
  const month = targetDate.getMonth() + 1; // 1-12
  const year = targetDate.getFullYear();
  const allocationDate = new Date(targetDate);
  
  console.log(`Starting Monthly Leave Allocation for ${month}/${year}...`);
  
  try {
    const employees = await Employee.find({ status: 'Active' });
    let processedCount = 0;
    let skippedCount = 0;
    const details = [];

    for (const emp of employees) {
      const designation = toLower(emp.designation || emp.position || '');
      const doj = emp.dateOfJoining || emp.hireDate || emp.createdAt;
      const mos = monthsBetween(doj, allocationDate);
      
      const isTrainee = designation.includes('trainee');
      const isConfirmed = isTrainee ? (mos >= 12) : (mos >= 6);

      // Fetch or Create Leave Balance
      let balanceDoc = await LeaveBalance.findOne({ employeeId: emp.employeeId });
      if (!balanceDoc) {
        balanceDoc = new LeaveBalance({
          employeeId: emp.employeeId,
          employeeName: emp.name,
          year: year,
          balances: {
            casual: { allocated: 0, used: 0, balance: 0, expired: 0 },
            sick: { allocated: 0, used: 0, balance: 0, expired: 0 },
            privilege: { allocated: 0, used: 0, balance: 0, expired: 0, nonCarryAllocated: 0, carryAllocated: 0, carryForwardEligibleBalance: 0, expired: 0, carryForwardBalance: 0 },
            totalBalance: 0
          }
        });
      }

      // --- Validation: Run only once per month per employee ---
      if (balanceDoc.lastAllocationMonth === month && balanceDoc.lastAllocationYear === year) {
        console.log(`Skipping ${emp.employeeId} - already allocated for ${month}/${year}`);
        skippedCount++;
        details.push({
          employeeId: emp.employeeId,
          employeeName: emp.name,
          cl: 0,
          sl: 0,
          pl: 0,
          isConfirmed,
          status: 'Skipped'
        });
        continue;
      }

      // --- Step 1: Negative Balance Reset (Requirement 1, 2, 5) ---
      // Before every monthly allocation, if balance < 0, reset to 0.
      // We do this by setting allocated = used.
      ['casual', 'sick', 'privilege'].forEach(type => {
        if (balanceDoc.balances[type].balance < 0) {
          console.log(`Resetting negative ${type} balance for ${emp.employeeId}: ${balanceDoc.balances[type].balance} -> 0`);
          balanceDoc.balances[type].allocated = balanceDoc.balances[type].used;
          balanceDoc.balances[type].balance = 0;
        }
      });

      // --- Step 2: Expiry Logic (Requirement 1, 2, 7) ---
      // Trainees < 1y and Others < 6m: Unused leave expires at month-end.
      if (!isConfirmed) {
        const plBalance = balanceDoc.balances.privilege.balance;
        if (plBalance > 0) {
          console.log(`Expiring unused PL for ${emp.employeeId}: ${plBalance}`);
          balanceDoc.balances.privilege.expired = (balanceDoc.balances.privilege.expired || 0) + plBalance;
          balanceDoc.balances.privilege.balance = 0;
        }
      }

      // --- Step 3: Allocation ---
      let clCredit = 0, slCredit = 0, plCredit = 0;

      if (isConfirmed) {
        // Confirmed: CL=0.5, SL=0.5, PL=1.25 (Requirement 3, 4)
        clCredit = 0.5;
        slCredit = 0.5;
        plCredit = 1.25;
      } else {
        // Probation/Trainee: PL=1.0, CL=0, SL=0 (Requirement 1, 2)
        plCredit = 1.0;
        clCredit = 0;
        slCredit = 0;
      }

      // Update balances
      balanceDoc.balances.privilege.allocated += plCredit;
      balanceDoc.balances.privilege.balance += plCredit;
      
      balanceDoc.balances.casual.allocated += clCredit;
      balanceDoc.balances.casual.balance += clCredit;
      
      balanceDoc.balances.sick.allocated += slCredit;
      balanceDoc.balances.sick.balance += slCredit;

      // Carry forward tracking (Requirement 3, 4, 7)
      if (isConfirmed) {
        // After confirmation, carry forward is enabled. 
        // We can track the carry forward balance as the balance before this allocation?
        // Actually, requirement 8 says summary should display "Carry forward balance".
        // If we want to strictly follow "Expired leave should not move to next month", 
        // the balance we have now (after potential negative reset and expiry) IS the carry forward part.
        balanceDoc.balances.privilege.carryForwardBalance = (balanceDoc.balances.privilege.balance - plCredit);
      } else {
        balanceDoc.balances.privilege.carryForwardBalance = 0;
      }

      // Update Total Balance
      balanceDoc.balances.totalBalance = 
        balanceDoc.balances.casual.balance + 
        balanceDoc.balances.sick.balance + 
        balanceDoc.balances.privilege.balance;
      
      // Update metadata
      balanceDoc.lastUpdated = new Date();
      balanceDoc.lastAllocationMonth = month;
      balanceDoc.lastAllocationYear = year;
      balanceDoc.lastAllocationDate = new Date();
      
      balanceDoc.markModified('balances');
      await balanceDoc.save();
      processedCount++;
      
      details.push({
        employeeId: emp.employeeId,
        employeeName: emp.name,
        cl: clCredit,
        sl: slCredit,
        pl: plCredit,
        isConfirmed,
        status: 'Success'
      });
      
      console.log(`Successfully allocated for ${emp.employeeId}. New PL: ${balanceDoc.balances.privilege.balance}`);
    }

    console.log(`Monthly Allocation completed. Processed ${processedCount}, Skipped ${skippedCount}.`);
    return { success: true, processedCount, skippedCount, details };
  } catch (err) {
    console.error('Error in runMonthlyAllocation:', err);
    throw err;
  }
};

const getPendingDeductions = async (employeeId, excludeLeaveId = null) => {
  const query = {
    employeeId,
    status: 'Pending'
  };
  if (excludeLeaveId) query._id = { $ne: excludeLeaveId };

  const pending = await LeaveApplication.find(query).lean();
  const agg = { CL: 0, SL: 0, PL: 0 };
  
  pending.forEach(l => {
    if (l.clUsed !== undefined || l.slUsed !== undefined || l.plUsed !== undefined) {
      agg.CL += Number(l.clUsed || 0);
      agg.SL += Number(l.slUsed || 0);
      agg.PL += Number(l.plUsed || 0) + Number(l.negativePL || 0);
    } else {
      if (l.leaveType === 'CL') agg.CL += Number(l.totalDays || 0);
      else if (l.leaveType === 'SL') agg.SL += Number(l.totalDays || 0);
      else if (l.leaveType === 'PL') agg.PL += Number(l.totalDays || 0);
    }
  });
  return agg;
};

const calculateLeaveSplit = (requestedDays, balances) => {
  let rem = requestedDays;
  const split = {
    clUsed: 0,
    slUsed: 0,
    plUsed: 0,
    negativePL: 0,
    lopDays: 0,
    remainingBalance: 0
  };

  // currentBalances expected format: { casual: { balance: X }, sick: { balance: Y }, privilege: { balance: Z } }
  const cl = Math.max(0, balances.casual?.balance || 0);
  const sl = Math.max(0, balances.sick?.balance || 0);
  const pl = Math.max(0, balances.privilege?.balance || 0);

  // 1. CL
  if (cl > 0) {
    split.clUsed = Math.min(rem, cl);
    rem -= split.clUsed;
  }

  // 2. SL
  if (rem > 0 && sl > 0) {
    split.slUsed = Math.min(rem, sl);
    rem -= split.slUsed;
  }

  // 3. PL
  if (rem > 0 && pl > 0) {
    split.plUsed = Math.min(rem, pl);
    rem -= split.plUsed;
  }

  // 4. Negative PL vs LOP
  if (rem > 0) {
    // Priority logic says CL -> SL -> PL -> Negative PL -> LOP.
    // Based on requirements, PL can go negative when CL and SL are 0 (which they are if rem > 0 here).
    // We'll allow PL to go negative.
    split.negativePL = rem;
    
    // For now, if we allow negative PL, we don't strictly need LOP unless there's a limit.
    // However, Req 3 mentions LOP. I'll make them equal for payroll visibility if requested,
    // but the most important thing is the negative balance.
    // If the user wants specific LOP days, they usually want it to match the negative part.
    split.lopDays = rem; 
  }

  // Calculate projected remaining balance
  split.remainingBalance = (cl - split.clUsed) + 
                           (sl - split.slUsed) + 
                           (pl - split.plUsed - split.negativePL);

  return split;
};

const applyLeaveDeduction = async (leaveApp) => {
  const LeaveBalance = require('../models/LeaveBalance');
  const targetEmployeeId = leaveApp.employeeId;
  if (!targetEmployeeId) return;

  const clUsed = Number(leaveApp.clUsed || 0);
  const slUsed = Number(leaveApp.slUsed || 0);
  const plUsed = Number(leaveApp.plUsed || 0);
  const negativePL = Number(leaveApp.negativePL || 0);
  const totalPlDebit = plUsed + negativePL;

  const updateObj = { $inc: {} };
  if (clUsed > 0) {
    updateObj.$inc['balances.casual.used'] = clUsed;
    updateObj.$inc['balances.casual.balance'] = -clUsed;
  }
  if (slUsed > 0) {
    updateObj.$inc['balances.sick.used'] = slUsed;
    updateObj.$inc['balances.sick.balance'] = -slUsed;
  }
  if (totalPlDebit > 0) {
    updateObj.$inc['balances.privilege.used'] = totalPlDebit;
    updateObj.$inc['balances.privilege.balance'] = -totalPlDebit;
  }
  
  const totalUsed = clUsed + slUsed + totalPlDebit;
  if (totalUsed > 0) {
    updateObj.$inc['balances.totalBalance'] = -totalUsed;
    await LeaveBalance.findOneAndUpdate(
      { employeeId: targetEmployeeId },
      updateObj
    );
  }
};

module.exports = {
  monthsBetween,
  monthsBetweenRange,
  toLower,
  calcBalanceForEmployee,
  mergeBalances,
  runMonthlyAllocation,
  recordTransaction,
  calculateLeaveSplit,
  getPendingDeductions,
  applyLeaveDeduction
};
