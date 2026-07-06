const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const User = require('./models/User');
    const user = await User.findOne({ employeeId: 'CDE089' });
    if (!user) {
      console.log('User CDE089 not found!');
      process.exit(1);
    }
    console.log('Current User Data:', { role: user.role, permissions: user.permissions });
    
    // Add required payroll permissions
    const requiredPermissions = ['payroll_access', 'payroll_details', 'compensation_master', 'cost_to_company', 'loan_summary', 'gratuity_summary', 'monthly_payroll', 'marriage_allowance', 'payroll_manage'];
    
    let permissionsUpdated = false;
    let newPermissions = user.permissions || [];
    
    requiredPermissions.forEach(perm => {
      if (!newPermissions.includes(perm)) {
        newPermissions.push(perm);
        permissionsUpdated = true;
      }
    });
    
    if (permissionsUpdated) {
      user.permissions = newPermissions;
    }
    
    // Also ensure role is finance if not already admin or hr
    if (!['admin', 'hr', 'director', 'manager', 'finance'].includes(user.role)) {
      user.role = 'finance';
      console.log('Updated role to finance');
    }
    
    await user.save();
    console.log('Successfully updated access for Arunkumar P (CDE089)');
    console.log('New Permissions:', user.permissions);
    console.log('New Role:', user.role);
    process.exit(0);
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
