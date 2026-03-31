const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/employees').then(async () => {
  const Appraisals = mongoose.connection.db.collection('selfappraisals');
  const Employees = mongoose.connection.db.collection('employees');
  const PayrollFY = mongoose.connection.db.collection('payroll_FY25-26');

  // Find accepted appraisals
  const appraisals = await Appraisals.find({ status: 'accepted_pending_effect' }).toArray();
  console.log('Found ' + appraisals.length + ' accepted appraisals');

  for (const app of appraisals) {
    const emp = await Employees.findOne({ _id: app.employeeId });
    if (emp) {
      const revised = app.releaseRevisedSnapshot || {};
      const record = {
        employeeId: emp.employeeId,
        employeeName: emp.name || emp.employeename,
        designation: app.promotion && app.promotion.recommended && app.promotion.newDesignation ? app.promotion.newDesignation : emp.designation,
        department: emp.department,
        location: emp.location,
        dateOfJoining: emp.dateOfJoining,
        employmentType: emp.employmentType || 'Permanent',
        basicDA: revised.basic || revised.basicDA || 0,
        hra: revised.hra || 0,
        specialAllowance: revised.special || revised.specialAllowance || 0,
        pf: revised.empPF || revised.pf || 0,
        tax: revised.tax || 0,
        professionalTax: revised.professionalTax || 0,
        loanDeduction: revised.loanDeduction || 0,
        lop: revised.lop || 0,
        gratuity: revised.gratuity || 0,
        totalEarnings: revised.gross || revised.totalEarnings || 0,
        netSalary: revised.net || revised.netSalary || app.revisedSalary || 0,
        ctc: app.revisedSalary || 0,
        accountNumber: emp.bankAccount || '-',
        updatedAt: new Date()
      };
      
      await PayrollFY.updateOne(
        { employeeId: emp.employeeId },
        { $set: record },
        { upsert: true }
      );
      console.log('Synced ' + emp.employeeId);
    }
  }
  console.log('Done');
  process.exit(0);
});
