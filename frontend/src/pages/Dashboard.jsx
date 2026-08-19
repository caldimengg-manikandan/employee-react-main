// Dashboard --> Home
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    UsersIcon, ClockIcon, CalendarIcon, BanknotesIcon, KeyIcon,
    FolderIcon, ShieldCheckIcon, DocumentTextIcon, CurrencyDollarIcon,
    DocumentChartBarIcon, ClipboardDocumentCheckIcon, ChartBarIcon,
    ClipboardDocumentListIcon, CurrencyRupeeIcon, BriefcaseIcon,
    UserGroupIcon, BellIcon, ChevronRightIcon, ArrowRightIcon,
    MagnifyingGlassIcon, ArrowRightOnRectangleIcon, BuildingOfficeIcon, UserIcon, StarIcon, SparklesIcon, AcademicCapIcon
} from '@heroicons/react/24/outline';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { employeeAPI, authAPI } from '../services/api';
import LoginAnnouncements from '../components/LoginAnnouncements';

// --- Custom hook to get window size ---
const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }

        window.addEventListener("resize", handleResize);
        handleResize(); // Set initial size

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return windowSize;
};

// --- Custom component for Y-Axis ticks with word wrapping ---
const CustomizedYAxisTick = (props) => {
    const { x, y, payload } = props;
    const { value } = payload;
    const words = value.split(' ');
    const maxLines = 3;
    let currentLine = '';
    const lines = [];

    words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length > 20 && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });
    lines.push(currentLine);

    const displayedLines = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
        displayedLines[maxLines - 1] += '...';
    }

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={0} textAnchor="end" fill="#666" fontSize={12}>
                {displayedLines.map((line, index) => (
                    <tspan x={0} dy={index === 0 ? 0 : 15} key={index}>
                        {line}
                    </tspan>
                ))}
            </text>
        </g>
    );
};

// --- Constants ---
const categoryImages = {
    'Work & Productivity': '/images/modules/work-productivity.png',
    'Leave Management': '/images/modules/leave-management.png',
    'Finance & Payroll': '/images/modules/finance-payroll.png',
    'Company & Resources': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1000',
    'Performance Management': '/images/modules/performance-management.png',
    'Support Center': '/images/modules/support-center.png'
};

const getCategoryStyles = (category) => {
    const styles = {
        'Work & Productivity': {
            iconBg: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white',
            badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-100',
            hoverBorder: 'hover:border-cyan-200 hover:shadow-cyan-100/50'
        },
        'Leave Management': {
            iconBg: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
            badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            hoverBorder: 'hover:border-emerald-200 hover:shadow-emerald-100/50'
        },
        'Finance & Payroll': {
            iconBg: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
            badgeBg: 'bg-amber-50 text-amber-700 border-amber-100',
            hoverBorder: 'hover:border-amber-200 hover:shadow-amber-100/50'
        },
        'Company & Resources': {
            iconBg: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
            badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
            hoverBorder: 'hover:border-purple-200 hover:shadow-purple-100/50'
        },
        'Performance Management': {
            iconBg: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
            badgeBg: 'bg-rose-50 text-rose-700 border-rose-100',
            hoverBorder: 'hover:border-rose-200 hover:shadow-rose-100/50'
        },
        'Support Center': {
            iconBg: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white',
            badgeBg: 'bg-teal-50 text-teal-700 border-teal-100',
            hoverBorder: 'hover:border-teal-200 hover:shadow-teal-100/50'
        }
    };
    return styles[category] || {
        iconBg: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        hoverBorder: 'hover:border-indigo-200 hover:shadow-indigo-100/50'
    };
};

const CategoryCard = ({ category, modules, onViewDetails, images }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const displayModules = isExpanded ? modules : modules.slice(0, 4);
    const styles = getCategoryStyles(category);

    return (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden group/card ${styles.hoverBorder}`}>
            <div className="h-40 overflow-hidden relative">
                <div className="absolute inset-0 bg-slate-900/10 group-hover/card:bg-slate-900/0 transition-colors z-10" />
                <img
                    src={images[category] || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000'}
                    alt={category}
                    className="w-full h-full object-cover transform scale-100 group-hover/card:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent z-20">
                    <h3 className="text-white font-extrabold text-lg tracking-wide">{category}</h3>
                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">{modules.length} modules</span>
                </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
                <ul className="space-y-2 flex-1">
                    {displayModules.map((mod, mIdx) => (
                        <li key={mIdx}>
                            <Link
                                to={mod.path}
                                className="flex items-center p-2 rounded-xl text-gray-700 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all duration-200 group"
                            >
                                <div className={`p-1.5 rounded-lg mr-3 transition-all duration-300 ${styles.iconBg} shadow-sm`}>
                                    <mod.icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-800 truncate group-hover:text-indigo-950">{mod.name}</div>
                                    {mod.description && (
                                        <div className="text-[10px] text-gray-400 truncate group-hover:text-gray-500">{mod.description}</div>
                                    )}
                                </div>
                                <ChevronRightIcon className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-gray-400 transition-all transform translate-x-[-4px] group-hover:translate-x-0 ml-1" />
                            </Link>
                        </li>
                    ))}
                </ul>
                {modules.length > 4 && (
                    <div className="pt-3 mt-3 border-t border-slate-50">
                        <button
                            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-center text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 transition-colors"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? 'Show Less' : `+ ${modules.length - 4} More Modules`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main Dashboard Component ---
const ProjectDashboard = () => {
    const navigate = useNavigate();

    // --- STATE MANAGEMENT ---
    const [kpis, setKpis] = useState({
        totalProjects: 0,
        completedProjects: 0,
        inProgressProjects: 0,
        pendingTasks: 0,
        pendingApprovals: 0,
        notifications: 0,
        leavesTaken: 0
    });
    const [dropdowns, setDropdowns] = useState({ projects: [], items: [] });
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [chartData, setChartData] = useState([]);
    const [infoData, setInfoData] = useState(null);
    const [chartTitle, setChartTitle] = useState('Overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [initialLoading, setInitialLoading] = useState(true);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [projectHistory, setProjectHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [greeting, setGreeting] = useState('');
    const [profile, setProfile] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const permissions = [...(user.permissions || [])];
    const role = user.role || 'employees';

    if (role === 'employees') {
        if (!permissions.includes('holiday_allowance')) permissions.push('holiday_allowance');
        if (!permissions.includes('holiday_working_request')) permissions.push('holiday_working_request');
    }

    const dailyQuotesList = useMemo(() => [
        {
            thought: "Daily Thought: Innovation begins when you question the status quo and strive for cleaner, smarter engineering solutions.",
            quote: "Engineering is not merely knowing and being knowledgeable; it is also a willingness to create and innovate.",
            author: "James Kip Finch"
        },
        {
            thought: "Daily Thought: Dedication and persistence pave the way for extraordinary achievements in every project.",
            quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
            author: "Winston Churchill"
        },
        {
            thought: "Daily Thought: Pay attention to details; precision and craftsmanship reflect our commitment to excellence.",
            quote: "Quality means doing it right when no one is looking.",
            author: "Henry Ford"
        },
        {
            thought: "Daily Thought: Strive for continuous learning and value creation. Empowering others elevates the whole team.",
            quote: "Strive not to be a success, but rather to be of value to your team and society.",
            author: "Albert Einstein"
        },
        {
            thought: "Daily Thought: Collaboration brings out the best in us. Diverse perspectives drive breakthrough ideas.",
            quote: "Teamwork makes the dream work. Together, every challenge becomes an opportunity.",
            author: "John C. Maxwell"
        },
        {
            thought: "Daily Thought: Take bold initiative today. Action is the bridge between vision and reality.",
            quote: "The way to get started is to quit talking and begin doing.",
            author: "Walt Disney"
        },
        {
            thought: "Daily Thought: Consistent daily improvements yield massive, sustainable long-term success.",
            quote: "Small daily improvements over time lead to stunning, long-term achievements.",
            author: "Robin Sharma"
        }
    ], []);

    const currentDailyQuote = useMemo(() => {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const diff = now - startOfYear;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        return dailyQuotesList[dayOfYear % dailyQuotesList.length];
    }, [dailyQuotesList]);

    // Set greeting based on time
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    // Disable back button
    useEffect(() => {
        // Push a new state to history to create a forward entry
        window.history.pushState(null, document.title, window.location.href);

        const handlePopState = (event) => {
            // When back button is pressed, push state again to keep user on current page
            window.history.pushState(null, document.title, window.location.href);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // Fetch dashboard stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [profileRes, announcements] = await Promise.all([
                    employeeAPI.getMyProfile().catch(() => ({ data: null })),
                    authAPI.announcement.getActive().catch(() => [])
                ]);
                if (profileRes && profileRes.data) {
                    setProfile(profileRes.data);
                }
                const notifCount = Array.isArray(announcements) ? announcements.length : 0;
                setAnnouncements(Array.isArray(announcements) ? announcements : []);
                setKpis(prev => ({
                    ...prev,
                    notifications: notifCount
                }));
            } catch (error) {
                console.error("Error fetching dashboard stats", error);
            }
        };
        fetchStats();
    }, []);

    const policyModuleName = role === 'admin' ? 'Policy Portal' : 'Policy';
    const modules = [
        // Timesheet
        { name: 'Timesheet', description: 'Log work hours', path: '/timesheet', icon: ClockIcon, permission: 'timesheet_access', allowEmployeeRole: true, category: 'Work & Productivity' },
        { name: 'Timesheet History', description: 'View past timesheets', path: '/timesheet/history', icon: DocumentChartBarIcon, permission: 'timesheet_access', allowEmployeeRole: true, category: 'Work & Productivity' },
        { name: 'Attendance Regularization', description: 'Regularize attendance', path: '/timesheet/regularization', icon: ClockIcon, permission: 'timesheet_access', allowEmployeeRole: true, category: 'Work & Productivity' },
        { name: 'Employee Attendance', description: 'Attendance tracking', path: '/timesheet/attendance', icon: ClockIcon, permission: 'attendance_access', showForRoles: ['admin', 'hr', 'manager'], category: 'Work & Productivity' },

        // Admin Timesheet
        { name: 'Admin Timesheet', description: 'Review and approve timesheets', path: '/admin/timesheet', icon: DocumentTextIcon, permission: 'admin_timesheet_access', showForRoles: ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'], category: 'Work & Productivity' },
        { name: 'Timesheet Summary', description: 'Overview of submissions', path: '/admin/timesheet/approval', icon: DocumentChartBarIcon, permission: 'admin_timesheet_access', showForRoles: ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'], category: 'Work & Productivity' },
        { name: 'Edit In and Out Time', description: 'Modify attendance timings', path: '/attendance/edit-time', icon: ClockIcon, permission: 'edit_attendance', showForRoles: ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'], category: 'Work & Productivity' },
        { name: 'Special Permission', description: 'Approve special attendance permissions', path: '/admin/special-permissions', icon: ClipboardDocumentCheckIcon, permission: 'special_permission', showForRoles: ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'], category: 'Work & Productivity' },
        { name: 'Attendance Approval', description: 'Review and approve attendance', path: '/timesheet/attendance-approval', icon: ClipboardDocumentCheckIcon, permission: 'attendance_access', showForRoles: ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'], category: 'Work & Productivity' },



        // Project

        { name: 'Project Allocation', description: 'Assign employees to projects', path: '/project-allocation', icon: FolderIcon, showForRoles: ['admin', 'projectmanager', 'manager',], allowEmployeeRole: true, category: 'Work & Productivity' },

        // Leave Management
        { name: 'Leave Summary', description: 'View leave summary', path: '/leave-management/summary', icon: ChartBarIcon, permission: 'leave_summary', showForRoles: ['admin', 'hr', 'manager'], category: 'Leave Management' },
        { name: 'Leave Balance', description: 'Check leave balance', path: '/leave-management/balance', icon: ClipboardDocumentListIcon, permission: 'leave_balance', category: 'Leave Management' },
        { name: 'Leave Applications', description: 'Apply & track leaves', path: '/leave-applications', icon: CalendarIcon, permission: 'leave_access', allowEmployeeRole: true, category: 'Leave Management' },
        { name: 'Office Holidays', description: 'Manage office holidays', path: '/leave-management/office-holidays', icon: CalendarIcon, permission: 'leave_summary', showForRoles: ['admin', 'hr'], category: 'Leave Management' },
        { name: 'Regional Holidays', description: 'Manage regional holidays', path: '/leave-management/regional-holidays', icon: CalendarIcon, permission: 'leave_summary', showForRoles: ['admin', 'hr'], category: 'Leave Management' },

        // Insurance & Policy
        { name: 'Induction Program', description: 'Employee onboarding & refresher', path: '/induction', icon: SparklesIcon, permission: 'induction_program', allowEmployeeRole: true, category: 'Company & Resources' },
        { name: 'Induction Admin', description: 'Manage induction modules & quiz', path: '/admin/induction', icon: AcademicCapIcon, permission: 'induction_admin', showForRoles: ['admin', 'hr', 'manager', 'director'], category: 'Company & Resources' },
        { name: 'Insurance', description: 'Manage health & life insurance', path: '/insurance', icon: ShieldCheckIcon, permission: 'insurance_access', allowEmployeeRole: true, category: 'Company & Resources' },
        { name: policyModuleName, description: 'Company rules & documents', path: '/policies', icon: DocumentTextIcon, allowEmployeeRole: true, category: 'Company & Resources' },
        { name: 'Resume Repository', description: 'Central resume repository', path: '/bank-of-resumes', icon: DocumentTextIcon, permission: 'resume_access', showForRoles: ['admin', 'hr'], category: 'Company & Resources' },

        // Payroll
        { name: 'Salary Slips', description: 'View payslips', path: '/salaryslips', icon: BanknotesIcon, allowEmployeeRole: true, category: 'Finance & Payroll' },
        { name: 'Payroll Details', description: 'Manage payroll details', path: '/payroll/details', icon: CurrencyRupeeIcon, permission: 'payroll_manage', showForRoles: ['admin', 'hr', 'finance', 'manager', 'director'], category: 'Finance & Payroll' },
        { name: 'Compensation Master', description: 'Manage employee compensation', path: '/payroll/compensation-master', icon: CurrencyRupeeIcon, permission: 'compensation_master', showForRoles: ['admin', 'hr', 'finance', 'manager', 'director'], category: 'Finance & Payroll' },

        { name: 'Cost to the Company', description: 'View CTC', path: '/payroll/cost-to-the-company', icon: CurrencyRupeeIcon, permission: 'payroll_view', showForRoles: ['admin', 'hr', 'finance', 'manager', 'director'], category: 'Finance & Payroll' },
        { name: 'Loan Summary', description: 'View loans', path: '/payroll/loan-summary', icon: BanknotesIcon, permission: 'loan_view', showForRoles: ['admin', 'hr', 'finance', 'manager', 'director'], category: 'Finance & Payroll' },
        { name: 'Gratuity Summary', description: 'View gratuity', path: '/payroll/gratuity-summary', icon: BanknotesIcon, permission: 'gratuity_view', showForRoles: ['admin', 'hr', 'finance', 'manager', 'director'], category: 'Finance & Payroll' },
        { name: 'Monthly Payroll', description: 'Process monthly payroll', path: '/payroll/monthly', icon: BanknotesIcon, permission: 'payroll_access', showForRoles: ['admin', 'hr', 'finance', 'manager', 'director'], category: 'Finance & Payroll' },
        { name: 'Marriage Allowance', description: 'Manage marriage allowance claims', path: '/payroll/marriage-allowance', icon: BanknotesIcon, permission: 'marriage_allowance', showForRoles: ['admin', 'hr', 'finance', 'manager', 'director'], category: 'Finance & Payroll' },
        { name: 'Allowance Master', description: 'Manage holiday working allowances', path: '/holidays-allowance', icon: BanknotesIcon, permission: 'holiday_allowance', showForRoles: ['admin', 'hr', 'manager'], category: 'Finance & Payroll' },
        { name: 'Holiday Working Requests', description: 'Manage and track holiday working approvals', path: '/allowance/holiday-working-request', icon: BanknotesIcon, permission: 'holiday_working_request', showForRoles: ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'], allowEmployeeRole: true, category: 'Finance & Payroll' },


        // Expenditure
        { name: 'Expenditure Management', description: 'Track company expenses', path: '/expenditure-management', icon: CurrencyDollarIcon, permission: 'expenditure_access', showForRoles: ['admin', 'hr', 'finance', 'manager', 'director'], category: 'Finance & Payroll' },

       // Performance Management
        { name: 'Self Appraisal', description: 'Submit self appraisal', path: '/performance/self-appraisal', icon: StarIcon, permission: 'self_appraisal', allowEmployeeRole: true, category: 'Performance Management' },
        { name: 'Team Appraisal', description: 'Review team performance', path: '/performance/team-appraisal', icon: StarIcon, permission: 'team_appraisal', showForRoles: ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'], category: 'Performance Management' },
        { name: 'Reviewer Approval', description: 'Approve appraisals', path: '/performance/reviewer-approval', icon: StarIcon, permission: 'reviewer_approval', showForRoles: ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'], category: 'Performance Management' },
        { name: 'Director Approval', description: 'Final approval', path: '/performance/director-approval', icon: StarIcon, permission: 'director_approval', showForRoles: ['admin', 'hr', 'manager', 'director'], category: 'Performance Management' },
        { name: 'Appraisal Workflow', description: 'Track appraisal status', path: '/performance/appraisal-workflow', icon: StarIcon, permission: 'appraisal_workflow', allowEmployeeRole: true, category: 'Performance Management' },
        { name: 'Appraisal Master', description: 'Manage increments', path: '/performance/increment-master', icon: StarIcon, permission: 'appraisal_master', showForRoles: ['admin', 'hr'], category: 'Performance Management' },
        { name: 'Increment Summary', description: 'View increment summary', path: '/performance/increment-summary', icon: StarIcon, permission: 'increment_summary', showForRoles: ['admin', 'hr', 'manager'], category: 'Performance Management' },
     { name: 'Attendance Summary', description: 'View attendance summary', path: '/performance/attendance-summary', icon: StarIcon, permission: 'attendance_summary', showForRoles: ['admin', 'hr', 'manager'], category: 'Performance Management' },



        // Other
        { name: 'Exit Form', description: 'Submit exit form', path: '/employee-exit/form', icon: ArrowRightOnRectangleIcon, permission: 'exit_form_access', allowEmployeeRole: true, category: 'Company & Resources' },
        { name: 'Exit Approval', description: 'Review and approve exit forms', path: '/employee-exit/approval', icon: ArrowRightOnRectangleIcon, permission: 'exit_approval_access', showForRoles: ['admin', 'hr', 'manager'], category: 'Company & Resources' },

        { name: 'Employee Reward Tracker', description: 'Track rewards', path: '/employee-reward-tracker', icon: BriefcaseIcon, permission: 'reward_access', showForRoles: ['admin', 'hr', 'manager'], category: 'Company & Resources' },
        { name: 'Employee Management', description: 'View and manage employees', path: '/employee-management', icon: UsersIcon, permission: 'employee_access', showForRoles: ['admin', 'hr'], category: 'Company & Resources' },
        { name: 'User Access', description: 'Manage user roles & permissions', path: '/user-access', icon: KeyIcon, permission: 'user_access', showForRoles: ['admin'], category: 'Company & Resources' },
        { name: 'Team Management', description: 'Manage teams', path: '/admin/team-management', icon: UserGroupIcon, permission: 'team_access', showForRoles: ['admin', 'manager'], category: 'Company & Resources' },
        { name: 'Internships', description: 'Manage interns & references', path: '/admin/interns', icon: BriefcaseIcon, permission: 'intern_reference', showForRoles: ['admin', 'hr', 'manager'], category: 'Company & Resources' },
        { name: 'Announcements', description: 'Manage company announcements', path: '/announcements', icon: BellIcon, permission: 'announcement_manage', showForRoles: ['admin', 'hr', 'manager'], category: 'Company & Resources' },
        { name: 'Asset Management', description: 'Manage assigned assets', path: '/asset-management', icon: BriefcaseIcon, allowEmployeeRole: true, category: 'Company & Resources' },

        { name: 'Unified Hub Calendar', description: 'View holidays & celebrations', path: '/calendar-master', icon: CalendarIcon, permission: 'celebration_view', allowEmployeeRole: true, category: 'Work & Productivity' },
        { name: 'My Profile', description: 'View & update personal profile', path: '/my-profile', icon: UserIcon, allowEmployeeRole: true, category: 'Company & Resources' },
        { name: 'Payroll History', description: 'Past payroll logs', path: '/payroll/history', icon: BanknotesIcon, permission: 'payroll_access', allowEmployeeRole: true, category: 'Finance & Payroll' },
        { name: 'Referral Bonus', description: 'Referral bonus tracking', path: '/payroll/referral-bonus', icon: BanknotesIcon, permission: 'referral_bonus', showForRoles: ['admin', 'hr', 'finance'], category: 'Finance & Payroll' },
        { name: 'Performance Pay', description: 'Performance pay details', path: '/performance/performance-pay', icon: StarIcon, permission: 'performance_pay', showForRoles: ['admin', 'hr', 'director'], category: 'Performance Management' },
        { name: 'Promotion History', description: 'Track employee promotions', path: '/performance/promotion-history', icon: StarIcon, permission: 'promotion_history', showForRoles: ['admin', 'hr'], category: 'Performance Management' },

        // Support Center
        { name: 'Raise Ticket', description: 'Submit a support ticket', path: '/support/raise-ticket', icon: ClipboardDocumentCheckIcon, permission: 'raise_ticket_access', allowEmployeeRole: true, category: 'Support Center' },
        { name: 'Support Dashboard', description: 'Overview of support requests', path: '/admin/support/dashboard', icon: DocumentChartBarIcon, permission: 'support_dashboard_access', showForRoles: ['admin', 'hr', 'it_admin'], category: 'Support Center' },
    ];

    const visibleModules = useMemo(() => {
        let filtered = modules.filter((m) => {
            // Admin, Director, and Manager see everything
            if (role === 'admin' || role === 'director' || role === 'manager') return true;

            // 1. Permission Check (Primary)
            // If module has a specific permission, user must have it
            if (m.permission && !permissions.includes(m.permission)) {
                return false;
            }

            // 2. Role Check (Secondary Safeguard)
            if (m.showForRoles && !m.showForRoles.includes(role)) {
                const isITAdmin = role === 'it_admin' || /IT Admin/i.test(user.designation || '');
                if (isITAdmin && m.showForRoles.includes('it_admin')) {
                    // Allow IT Admin
                } else if (role !== 'admin' && role !== 'director' && role !== 'manager' && m.allowEmployeeRole !== true) {
                    return false;
                }
            }

            // 3. Employee Specific Check
            if (role === 'employees' && m.allowEmployeeRole === false) {
                return false;
            }

            return true;
        });

        // Filter by search term if exists
        if (searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(m =>
                m.name.toLowerCase().includes(term) ||
                m.description.toLowerCase().includes(term) ||
                m.category.toLowerCase().includes(term)
            );
        }

        return filtered;
    }, [role, permissions, searchTerm]);

    // Group modules by category
    const groupedModules = useMemo(() => {
        return visibleModules.reduce((acc, module) => {
            if (!acc[module.category]) {
                acc[module.category] = [];
            }
            acc[module.category].push(module);
            return acc;
        }, {});
    }, [visibleModules]);

    // --- CONSTANTS ---
    const API_BASE_URL = 'http://localhost:5003/api/dashboard';
    const ENABLE_DASHBOARD_DATA = false;
    const COLORS = [
        '#93c5fd', '#fdba74', '#86efac', '#fca5a5', '#d8b4fe', '#f9a8d4', '#67e8f9', '#fde047',
        '#a5b4fc', '#fb923c', '#6ee7b7', '#f87171', '#c4b5fd', '#f0abfc', '#67e8f9', '#fcd34d'
    ];
    const PIE_CHART_LIMIT = 100;

    // Special colors for Quantity Comparison
    const QUANTITY_COLORS = {
        'Consumed Quantity': '#f97316',
        'Remaining Quantity': '#2563eb'
    };



    // --- DATA FETCHING HOOKS ---
    useEffect(() => {
        if (!ENABLE_DASHBOARD_DATA) {
            setInitialLoading(false);
            return;
        }
        const fetchInitialData = async () => {
            try {
                setInitialLoading(true);
                const token = sessionStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const [kpisRes, dropdownsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/kpis`, { headers }),
                    fetch(`${API_BASE_URL}/dropdowns`, { headers })
                ]);
                if (!kpisRes.ok || !dropdownsRes.ok) throw new Error('Failed to fetch initial data');
                const kpisData = await kpisRes.json();
                const dropdownsData = await dropdownsRes.json();
                setKpis(prev => ({ ...prev, ...kpisData }));
                setDropdowns(dropdownsData);
            } catch (err) {
                setError('');
            } finally {
                setInitialLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!ENABLE_DASHBOARD_DATA) return;
        const fetchDashboardData = async () => {
            if (initialLoading) return;
            setLoading(true);
            setError('');
            const params = new URLSearchParams();
            if (selectedProject) params.append('project', selectedProject);
            if (selectedItem) params.append('item', selectedItem);
            try {
                const token = sessionStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const response = await fetch(`${API_BASE_URL}/data?${params.toString()}`, { headers });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setChartData(data.chartData || []);
                setInfoData(data.infoData || null);
                setChartTitle(data.chartTitle || 'Overview');
            } catch (err) {
                setError('');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [selectedProject, selectedItem, initialLoading]);

    // --- EVENT HANDLERS ---
    const handleProjectChange = (e) => setSelectedProject(e.target.value);
    const handleItemChange = (e) => setSelectedItem(e.target.value);
    const clearFilters = () => {
        setSelectedProject('');
        setSelectedItem('');
    };

    const handleTotalProjectsClick = async () => {
        setHistoryLoading(true);
        setShowHistoryModal(true);
        try {
            const token = sessionStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const response = await fetch(`${API_BASE_URL}/projects`, { headers });
            if (!response.ok) throw new Error('Failed to fetch project history');
            const data = await response.json();
            setProjectHistory(data);
        } catch (err) {
            console.error("Error fetching project history:", err);
            setProjectHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        navigate('/login');
    };

    // --- CHILD COMPONENTS & HELPERS ---
    const KpiCard = React.memo(({ title, value, color, icon, onClick, description }) => (
        <div
            onClick={onClick}
            className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${color.border} transform hover:-translate-y-1 transition-all duration-300 flex-1 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
                    <h3 className={`text-2xl font-bold mt-1 ${color.text}`}>{value}</h3>
                </div>
                <div className={`p-2 rounded-lg ${color.bg}`}>
                    {icon}
                </div>
            </div>
            {description && <p className="text-sm text-gray-500 mt-4">{description}</p>}
        </div>
    ));

    const ModuleCard = ({ module }) => {
        const styles = getCategoryStyles(module.category);
        return (
            <Link
                to={module.path}
                className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full group ${styles.hoverBorder}`}
            >
                <div className="flex items-start mb-4">
                    <div className={`p-3 rounded-xl mr-4 transition-colors duration-300 ${styles.iconBg}`}>
                        <module.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 mb-1 truncate group-hover:text-indigo-950">{module.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2">{module.description}</p>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-300 ml-2 group-hover:text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${styles.badgeBg}`}>
                        {module.category}
                    </span>
                    <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-600 transition-colors">Open Page →</span>
                </div>
            </Link>
        );
    };



    const CustomTooltipContent = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const name = label || payload[0].payload.name;
            const value = payload[0].value;
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-xl text-sm">
                    <p className="font-bold text-gray-800">{name}</p>
                    <p className="text-indigo-600">{`Quantity: ${value}`}</p>
                </div>
            );
        }
        return null;
    };

    const InfoBoxContent = () => {
        if (!infoData) return <p className="text-gray-500">No details to display.</p>;
        const { type, details } = infoData;
        switch (type) {
            case 'project':
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-2 text-indigo-700">{details?.projectName || 'Project Details'}</h3>
                        <p><span className="font-semibold">Status:</span> <span className={`capitalize font-medium ${details?.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>{details?.status?.replace('_', ' ') || 'N/A'}</span></p>
                        <p><span className="font-semibold">Remarks:</span> {details?.remarks || 'None'}</p>
                    </div>
                );
            case 'item':
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-2 text-indigo-700">Item: {details?.name}</h3>
                        <p className="font-semibold mb-1">Used in projects:</p>
                        <ul className="list-disc list-inside ml-4 text-sm">
                            {details?.usage?.length > 0 ? details.usage.map((use, i) => (
                                <li key={i}>{use.construction} ({use.activeQuantity} units)</li>
                            )) : <li>No projects found.</li>}
                        </ul>
                    </div>
                );
            case 'specific':
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-2 text-indigo-700">Specific Details</h3>
                        <p><span className="font-semibold">Project:</span> {details?.construction}</p>
                        <p><span className="font-semibold">Item:</span> {details?.itemDescription}</p>
                        <p><span className="font-semibold">Total Quantity (All Projects):</span> {details?.totalQuantity}</p>
                        <p><span className="font-semibold">Consumed Quantity (This Project):</span> {details?.consumedQuantity || 0}</p>
                        <p><span className="font-semibold">Status:</span> {details?.status}</p>
                        <p><span className="font-semibold">Comment:</span> {details?.comment || 'None'}</p>
                    </div>
                );
            default:
                return <p className="text-gray-600">{details?.message || "Select a filter to view details."}</p>;
        }
    };

    const ProjectHistoryModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">All Projects</h2>
                    <button
                        onClick={() => setShowHistoryModal(false)}
                        className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {historyLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : projectHistory.length > 0 ? (
                        <table className="w-full text-left table-auto">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-sm font-semibold text-gray-600 w-16">S.No</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Project</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {projectHistory.map((proj, index) => (
                                    <tr key={proj._id || index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{proj.projectName}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${proj.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {proj.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-gray-500 mt-8">No project history found.</p>
                    )}
                </div>
            </div>
        </div>
    );

    // Helper to determine if chart is showing a quantity comparison
    const isQuantityComparison = () => {
        return chartData.some(item =>
            item.name === 'Consumed Quantity' || item.name === 'Remaining Quantity'
        );
    };

    // --- Chart rendering component ---
    const RenderChart = () => {
        const { width } = useWindowSize();
        const isMobile = width < 768;
        const isComparison = isQuantityComparison();

        if (chartData.length > PIE_CHART_LIMIT && !isComparison) {
            const barHeight = 60;
            const chartHeight = barHeight * chartData.length;
            return (
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart
                        layout="vertical"
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 100, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={150}
                            tick={<CustomizedYAxisTick />}
                            interval={0}
                        />
                        <Tooltip content={<CustomTooltipContent />} cursor={{ fill: '#f3f4f6' }} />
                        <Bar dataKey="value" barSize={25}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            );
        }

        return (
            <ResponsiveContainer width="100%" height={isMobile ? 500 : 400}>
                <PieChart>
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx={isMobile ? "50%" : "40%"}
                        cy="50%"
                        outerRadius={120}
                        innerRadius={50}
                        label={null}
                        labelLine={false}
                    >
                        {chartData.map((entry, index) => {
                            const fillColor = isComparison && QUANTITY_COLORS[entry.name]
                                ? QUANTITY_COLORS[entry.name]
                                : COLORS[index % COLORS.length];
                            return (
                                <Cell key={`cell-${index}`} fill={fillColor} />
                            );
                        })}
                    </Pie>
                    <Tooltip content={<CustomTooltipContent />} />
                    <Legend
                        layout={isMobile ? "horizontal" : "vertical"}
                        verticalAlign={isMobile ? "bottom" : "middle"}
                        align={isMobile ? "center" : "right"}
                        iconType="square"
                        wrapperStyle={{
                            paddingLeft: isMobile ? 0 : '20px',
                            paddingTop: isMobile ? '20px' : 0,
                            maxHeight: '350px',
                            overflowY: 'auto'
                        }}
                        formatter={(value, entry) => {
                            const { value: quantity } = entry.payload;
                            const label = `${value}: ${quantity}`;

                            if (isMobile && label.length > 30) {
                                return (
                                    <span className="text-gray-700 text-sm">
                                        {`${label.substring(0, 27)}...`}
                                    </span>
                                );
                            }
                            return (
                                <span className="text-gray-700 text-sm">{label}</span>
                            );
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        );
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Hero Section */}
            <div className="relative min-h-[440px] w-full overflow-hidden flex flex-col justify-between">
                <div className="absolute inset-0">
                    <img
                        src="/images/hero-bg.png"
                        alt="Hero Background"
                        className="w-full h-full object-fill opacity-90"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000";
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0A0F2C]/85 via-[#1A237E]/70 to-[#4A148C]/55" />
                </div>

                {/* Company Branding Overlay at Top Center */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 shadow-xl">
                    <img src="/images/steel-logo.png" alt="CALDIM" className="h-7 w-auto object-contain" />
                    <div className="text-left flex flex-col">
                        <span className="text-white font-extrabold text-base leading-none tracking-wider">CALDIM</span>
                        <span className="text-[10px] font-bold tracking-[0.18em] text-[#ff8c00] uppercase mt-0.5">ENGINEERING PVT. LTD.</span>
                    </div>
                </div>

                <div className="relative z-10 container mx-auto px-6 pt-12 pb-6 flex flex-col md:flex-row items-center justify-between">
                    <div className="max-w-2xl animate-fade-in-up w-full md:w-7/12">
                        <h1 className="text-3xl md:text-4xl font-stylish text-white mb-2 tracking-tight">
                            {greeting}, {user.name?.split(' ')[0] || 'Employee'}!
                        </h1>
                        <p className="text-base text-blue-100 mb-5">
                            Welcome! Find everything you need to manage your work, benefits, and more.
                        </p>

                        {/* Daily Thought & Quote - Larger Size Asymmetric Curved Ribbon */}
                        <div className="mb-6 max-w-2xl p-6 rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-2xl rounded-bl-2xl bg-gradient-to-r from-amber-500/20 via-indigo-900/40 to-blue-950/60 backdrop-blur-md border-l-4 border-amber-400 border-t border-b border-r border-amber-300/30 shadow-2xl text-white relative overflow-hidden group">
                            {/* Decorative Corner Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

                            <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-white/15">
                                <SparklesIcon className="h-5 w-5 text-amber-300 animate-pulse" />
                                <span className="font-extrabold text-xs uppercase tracking-wider text-amber-300">
                                    Thought & Quote of the Day
                                </span>
                            </div>

                            <div className="space-y-3 relative z-10">
                                <p className="text-sm font-semibold text-amber-100 leading-relaxed">
                                    <span className="text-amber-300 font-bold uppercase tracking-wider text-xs bg-amber-500/25 px-2.5 py-0.5 rounded mr-1.5 border border-amber-400/30">
                                        Insight
                                    </span>
                                    {currentDailyQuote.thought}
                                </p>
                                <blockquote className="italic text-sm text-white/95 leading-relaxed font-serif pt-1 pl-3 border-l-2 border-amber-300/70">
                                    "{currentDailyQuote.quote}"
                                    <span className="not-italic font-sans text-xs text-amber-300 font-bold ml-2.5">
                                        — {currentDailyQuote.author}
                                    </span>
                                </blockquote>
                            </div>
                        </div>
                    </div>

                    {/* Profile Details Card */}
                    <div className="w-full md:w-4/12 mt-8 md:mt-0 animate-fade-in-up delay-200">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-xl text-white transform hover:scale-105 transition-all duration-300">
                            <div className="flex items-center mb-6 border-b border-white/10 pb-4">
                                {/* Employee Passport Size Photo Frame (3.5 x 4.5 cm / 3:4 aspect ratio) */}
                                <div className="w-[70px] h-[90px] rounded-lg border-2 border-white/40 shadow-md mr-4 bg-slate-900 flex-shrink-0 overflow-hidden relative group">
                                    {profile?.profilePicture || profile?.photo || user?.profilePicture || user?.photo ? (
                                        <img
                                            src={profile?.profilePicture || profile?.photo || user?.profilePicture || user?.photo}
                                            alt={user.name || 'Passport Photo'}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 text-white">
                                            <span className="text-2xl font-bold">{user.name ? user.name.charAt(0).toUpperCase() : 'E'}</span>
                                            <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5">Photo</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-serif font-bold text-xl text-white tracking-wide">{user.name || 'Employee'}</h3>
                                    <p className="text-blue-200 text-sm font-medium">{profile?.designation || user.designation || 'Designation'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                    <span className="text-blue-200 text-sm">Employee ID</span>
                                    <span className="font-semibold">{profile?.employeeId || user.employeeId || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                    <span className="text-blue-200 text-sm">Division</span>
                                    <span className="font-semibold">{profile?.division || user.division || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                    <span className="text-blue-200 text-sm">Location</span>
                                    <span className="font-semibold">{profile?.location || user.location || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Scrolling Announcement Ticker */}
                <div className="relative z-20 w-full">
                    <LoginAnnouncements mode="ticker" />
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8 relative z-20">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Stats Grid */}
                {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <KpiCard 
                        title="Pending Tasks" 
                        value={kpis.pendingTasks} 
                        color={{ border: 'border-blue-500', text: 'text-gray-800', bg: 'bg-blue-50' }}
                        icon={<ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-600" />}
                        description="Timesheets & Leaves"
                    />
                    
                    {['admin', 'manager', 'hr'].includes(role) && (
                        <KpiCard 
                            title="Pending Approvals" 
                            value={kpis.pendingApprovals} 
                            color={{ border: 'border-purple-500', text: 'text-gray-800', bg: 'bg-purple-50' }}
                            icon={<UsersIcon className="h-6 w-6 text-purple-600" />}
                            description="Requires Action"
                        />
                    )}

                    <KpiCard 
                        title="Notifications" 
                        value={kpis.notifications} 
                        color={{ border: 'border-orange-500', text: 'text-gray-800', bg: 'bg-orange-50' }}
                        icon={<BellIcon className="h-6 w-6 text-orange-600" />}
                        description="Unread Updates"
                        onClick={() => navigate('/notifications')}
                    />
                    
                    <KpiCard 
                        title="Leaves Taken" 
                        value={kpis.leavesTaken} 
                        color={{ border: 'border-green-500', text: 'text-gray-800', bg: 'bg-green-50' }}
                        icon={<CalendarIcon className="h-6 w-6 text-green-600" />}
                        description="Approved Leaves"
                    />
                </div> */}

                {/* User Profile Summary */}
                <br />

                {searchTerm ? (
                    // Search Results View
                    <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                            <MagnifyingGlassIcon className="h-6 w-6 mr-2 text-blue-600" />
                            Search Results
                        </h2>
                        {visibleModules.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {visibleModules.map((module, idx) => (
                                    <ModuleCard key={`${module.path}-${module.name}`} module={module} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-lg">No modules found matching "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // Categorized View
                    <div className="space-y-8">
                        {/* Categorized Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {Object.entries(groupedModules).map(([category, modules], idx) => (
                                <CategoryCard
                                    key={category}
                                    category={category}
                                    modules={modules}
                                    images={categoryImages}
                                    onViewDetails={(cat) => setSearchTerm(cat)}
                                />
                            ))}
                        </div>

                        {/* Dashboard Data Section */}
                        {ENABLE_DASHBOARD_DATA && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <KpiCard
                                        title="Total Projects"
                                        value={kpis.totalProjects}
                                        color={{ border: 'border-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' }}
                                        icon={<FolderIcon className="h-6 w-6 text-blue-600" />}
                                        onClick={handleTotalProjectsClick}
                                        description="Active Projects"
                                    />
                                    <KpiCard
                                        title="Completed"
                                        value={kpis.completedProjects}
                                        color={{ border: 'border-green-500', text: 'text-green-600', bg: 'bg-green-50' }}
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                    />
                                    <KpiCard
                                        title="In Progress"
                                        value={kpis.inProgressProjects}
                                        color={{ border: 'border-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50' }}
                                        icon={<ClockIcon className="h-6 w-6 text-yellow-600" />}
                                    />
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-md mb-8 flex flex-wrap items-center gap-4">
                                    <h3 className="text-xl font-bold text-gray-800 mr-4">Filters</h3>
                                    <div className="flex-grow">
                                        <select value={selectedProject} onChange={handleProjectChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                            <option value="">-- Select a Project --</option>
                                            {dropdowns.projects.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-grow">
                                        <select value={selectedItem} onChange={handleItemChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                            <option value="">-- Select an Item --</option>
                                            {dropdowns.items.map(i => <option key={i} value={i}>{i}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={clearFilters} className="bg-gray-700 text-white px-5 py-2 rounded-lg hover:bg-gray-800 font-semibold shadow-sm">Clear Filters</button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                    <div className={`${infoData && !loading ? 'lg:col-span-3' : 'lg:col-span-5'} bg-white p-6 rounded-xl shadow-md`}>
                                        <h2 className="text-2xl font-bold text-gray-800 mb-4">{chartTitle}</h2>
                                        {loading ? (
                                            <div className="flex justify-center items-center h-full"><p>Loading...</p></div>
                                        ) : chartData.length > 0 ? (
                                            <RenderChart />
                                        ) : (
                                            <div className="flex justify-center items-center h-full"><p>No data available.</p></div>
                                        )}
                                    </div>

                                    {infoData && !loading && (
                                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Information</h2>
                                            <InfoBoxContent />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 border-t border-gray-200 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
                    <p>© {new Date().getFullYear()} Caldim Engineering Pvt. Ltd. All rights reserved.</p>

                </div>
            </div>
            {showHistoryModal && <ProjectHistoryModal />}
            {showAnnouncementsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b">
                            <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
                            <button
                                onClick={() => setShowAnnouncementsModal(false)}
                                className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            {announcements.length === 0 ? (
                                <p className="text-center text-gray-500 mt-8">No active notifications.</p>
                            ) : (
                                <div className="space-y-4">
                                    {announcements.map((a) => (
                                        <div key={a._id || a.id} className="border border-gray-200 rounded-lg p-4">
                                            <h3 className="text-lg font-semibold text-gray-900">{a.title || 'Announcement'}</h3>
                                            <p className="text-sm text-gray-700 mt-2">{a.message || a.description || ''}</p>
                                            {a.createdAt && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {new Date(a.createdAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDashboard;
