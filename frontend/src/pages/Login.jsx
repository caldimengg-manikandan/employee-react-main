import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({
    employeeId: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    employeeId: '',
    otp: '',
    newPassword: ''
  });
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  
  // Modal states
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  
  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const navigate = useNavigate();

  // Company history slideshow images
  const slides = [
    {
      url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      title: "Engineering Excellence",
      desc: "State-of-the-art engineering solutions"
    },
    {
      url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      title: "Team Collaboration",
      desc: "Our expert team working together"
    },
    {
      url: "https://images.unsplash.com/photo-1507206130118-b5907f817163?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      title: "Innovation Hub",
      desc: "Driving innovation in construction"
    },
    {
      url: "https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      title: "Project Success",
      desc: "Successful project delivery"
    }
  ];

  // Holiday Calendar 2026 data
  const holidays2026= [
    { month: 'JAN', date: '26', occasion: 'Republic Day', day: 'Wednesday' },
    { month: 'MAR', date: '07', occasion: 'Maha Shivaratri', day: 'Tuesday' },
    { month: 'MAR', date: '25', occasion: 'Holi', day: 'Saturday' },
    { month: 'APR', date: '14', occasion: 'Ambedkar Jayanti', day: 'Friday' },
    { month: 'MAY', date: '01', occasion: 'Labour Day', day: 'Monday' },
    { month: 'AUG', date: '15', occasion: 'Independence Day', day: 'Tuesday' },
    { month: 'OCT', date: '02', occasion: 'Gandhi Jayanti', day: 'Monday' },
    { month: 'DEC', date: '25', occasion: 'Christmas', day: 'Monday' }
  ];

  // Today's Updates data
  const todaysUpdates = [
    { 
      id: 1, 
      title: "Employee Pension Scheme", 
      description: "Important Announcement: Employee Pension Scheme - Circular & Annexures have been released.", 
      time: "Today, 10:30 AM",
      priority: "high"
    },
    { 
      id: 2, 
      title: "Team Building Workshop", 
      description: "Register for the upcoming team building workshop scheduled for next Friday.", 
      time: "Yesterday",
      priority: "medium"
    },
    { 
      id: 3, 
      title: "Quarterly Performance Reviews", 
      description: "Quarterly performance reviews will commence next week.", 
      time: "2 days ago",
      priority: "medium"
    }
  ];

  // Skills data for About Us modal
  const skills = [
    { name: "Steel Detailing", percentage: 100 },
    { name: "Connection Design", percentage: 100 },
    { name: "Rebar Detailing", percentage: 90 },
    { name: "Precast Detailing & Design", percentage: 90 },
    { name: "Architectural", percentage: 80 },
    { name: "Structural", percentage: 80 },
    { name: "BIM Services", percentage: 80 },
    { name: "MEP", percentage: 80 },
    { name: "DAS Software", percentage: 90 },
    { name: "Electrical", percentage: 50 }
  ];

  // Slideshow auto-rotate
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleForgotPasswordChange = (e) => {
    setForgotPasswordData({
      ...forgotPasswordData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = { ...formData };
      const response = await authAPI.login(payload);
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
      window.history.replaceState(null, '', '/dashboard');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      await authAPI.forgotPassword({ employeeId: forgotPasswordData.employeeId });
      setForgotPasswordStep(2);
      setForgotPasswordMessage('OTP sent to your email');
    } catch (error) {
      setForgotPasswordMessage(error.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await authAPI.resetPassword({
        employeeId: forgotPasswordData.employeeId,
        otp: forgotPasswordData.otp,
        newPassword: forgotPasswordData.newPassword
      });
      setForgotPasswordMessage('Password reset successfully');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep(1);
        setForgotPasswordData({ employeeId: '', otp: '', newPassword: '' });
        setForgotPasswordMessage('');
      }, 2000);
    } catch (error) {
      setForgotPasswordMessage(error.response?.data?.message || 'Failed to reset password');
    }
  };

  // About Us Modal
  const AboutUsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-white/20">
          <h2 className="text-2xl font-bold text-white text-center" style={{ fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif" }}>
            About CALDIM Engineering
          </h2>
          <button
            onClick={() => setShowAboutUs(false)}
            className="absolute right-6 top-6 text-white hover:text-blue-300 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content - With Scroll Enabled */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {/* Company History */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Our Company History</h3>
            <div className="space-y-4 text-blue-100">
              <p className="leading-relaxed">
                <span className="font-bold text-white">CALDIM Engineering Pvt. Ltd.</span> was founded with a vision to revolutionize the engineering and detailing services in the construction industry. From humble beginnings, we have grown into a premier partner for comprehensive engineering solutions.
              </p>
              <p className="leading-relaxed">
                We are your premier partner for comprehensive engineering and detailing services tailored to the construction industry. With a dedicated team of skilled professionals and a commitment to excellence, we specialize in delivering a wide range of services to meet the diverse needs of our clients.
              </p>
              <p className="leading-relaxed">
                At Caldim, we are committed to exceeding client expectations, prioritizing quality, reliability, and client satisfaction in everything we do. Partner with us for your next construction project and experience the difference that our comprehensive engineering and detailing services can make.
              </p>
            </div>
          </div>

          {/* Capabilities */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Our Capabilities</h3>
            <ul className="space-y-3 text-blue-100">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 mt-2"></span>
                NISD Certified detailers on board
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 mt-2"></span>
                Signed and sealed calculations for connection design with detailing
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 mt-2"></span>
                Experience in handling large and complex projects
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 mt-2"></span>
                Ability to work with contractors, Engineers and design/build services
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Our Services</h3>
            <p className="text-blue-100 mb-6">
              From structural design and analysis to architectural detailing and MEP coordination, Caldim offers a full suite of engineering solutions to support every stage of the construction process. Our expertise spans across various sectors, including residential, commercial, industrial, and institutional projects.
            </p>
            
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl p-6 border border-white/10">
              <h4 className="text-lg font-bold text-white mb-4">Our Expertise</h4>
              <div className="space-y-4">
                {skills.map((skill, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-200 font-medium">{skill.name}</span>
                      <span className="text-white font-bold">{skill.percentage}%</span>
                    </div>
                    <div className="h-2 bg-blue-900/40 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
                        style={{ width: `${skill.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leadership Team */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Our Leadership Team</h3>
            <p className="text-blue-100 leading-relaxed">
              Our leadership team exemplifies exceptional skill and versatility in navigating diverse challenges and driving our organization forward. Each member brings a unique blend of expertise and experience to the table, allowing us to tackle a wide range of issues with confidence and finesse. Whether it's strategizing for growth, resolving complex issues, or fostering innovation, our leaders demonstrate a remarkable ability to adapt to changing circumstances and lead with agility.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Holidays Modal
  const HolidaysModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-white/20">
          <h2 className="text-2xl font-bold text-white text-center" style={{ fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif" }}>
            CALDIM Holidays Calendar 2026
          </h2>
          <button
            onClick={() => setShowHolidays(false)}
            className="absolute right-6 top-6 text-white hover:text-blue-300 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content - No Scroll */}
        <div className="p-6">
          <div className="mb-6 text-center">
            <p className="text-blue-200 mb-4">Plan your leaves with our official holiday calendar</p>
            <div className="inline-flex items-center bg-blue-900/30 px-4 py-2 rounded-full">
              <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span className="text-white font-medium">Total Holidays: {holidays2026.length} Days</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {holidays2026.map((holiday, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-4 text-center border border-white/10 hover:scale-105 transition-transform duration-300"
              >
                <div className="text-blue-300 text-xs font-medium uppercase">
                  {holiday.month}
                </div>
                <div className="text-3xl font-bold text-white my-2">
                  {holiday.date}
                </div>
                <div className="text-blue-200 text-xs mb-1">
                  {holiday.day}
                </div>
                <div className="text-white text-sm font-medium">
                  {holiday.occasion}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-900/20 rounded-xl">
            <p className="text-center text-blue-200 text-sm">
              Note: All holidays are subject to change as per company policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Updates Modal
  const UpdatesModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif" }}>
                Today's Updates
              </h2>
              <p className="text-blue-200 text-sm">Latest announcements and notifications</p>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
              <span className="text-green-300 text-sm font-medium">Live Updates</span>
            </div>
          </div>
          <button
            onClick={() => setShowUpdates(false)}
            className="absolute right-6 top-6 text-white hover:text-blue-300 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content - No Scroll */}
        <div className="p-6">
          <div className="mb-6">
            <div className="inline-flex items-center bg-gradient-to-r from-blue-600/30 to-purple-600/30 px-4 py-2 rounded-full">
              <svg className="w-5 h-5 text-white mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="text-white font-medium">Last Updated: Today, 10:45 AM</span>
            </div>
          </div>

          <div className="space-y-4">
            {todaysUpdates.map((update) => (
              <div 
                key={update.id} 
                className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-start">
                  <div className={`mr-4 mt-1 w-3 h-3 rounded-full ${
                    update.priority === 'high' ? 'bg-red-400' :
                    update.priority === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-white">{update.title}</h3>
                      <span className="text-blue-300 text-sm bg-blue-900/30 px-3 py-1 rounded-full">{update.time}</span>
                    </div>
                    <p className="text-blue-100">{update.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-900/20 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <p className="text-blue-200 text-sm">
                For more detailed information, visit the official announcements section in the portal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Forgot Password Component
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C]">
        <div className="absolute inset-0 bg-black/30"></div>

        <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#0A0F2C] mb-2" style={{ fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif" }}>
              Forgot Password
            </h1>
            <p className="text-gray-600 text-sm">Reset your account password</p>
          </div>

          <form className="space-y-4" onSubmit={forgotPasswordStep === 1 ? handleSendOtp : handleResetPassword}>
            {forgotPasswordStep === 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Employee ID</label>
                <input
                  type="text"
                  name="employeeId"
                  value={forgotPasswordData.employeeId}
                  onChange={handleForgotPasswordChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {forgotPasswordStep === 2 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">OTP</label>
                  <input
                    type="text"
                    name="otp"
                    value={forgotPasswordData.otp}
                    onChange={handleForgotPasswordChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={forgotPasswordData.newPassword}
                    onChange={handleForgotPasswordChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {forgotPasswordMessage && (
              <div className={`text-sm p-3 rounded-lg ${forgotPasswordMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {forgotPasswordMessage}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-[#0A0F2C] to-[#4A148C] text-white py-2 px-4 rounded-lg font-medium hover:from-[#1A237E] hover:to-[#6A1B9A] transition-all duration-200"
              >
                {forgotPasswordStep === 1 ? 'Send OTP' : 'Reset'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordStep(1);
                  setForgotPasswordData({ employeeId: '', otp: '', newPassword: '' });
                  setForgotPasswordMessage('');
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modals */}
      {showAboutUs && <AboutUsModal />}
      {showHolidays && <HolidaysModal />}
      {showUpdates && <UpdatesModal />}
      
      <div className="min-h-screen flex bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C] overflow-hidden">
        {/* Left Side - Login Box */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md">
            {/* Header with new CALDIM font */}
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold text-white mb-2 tracking-tight" 
                  style={{ 
                    fontFamily: "'Calibri', 'Candara', 'Segoe', 'Segoe UI', 'Optima', 'Arial', 'sans-serif'",
                    fontWeight: '700',
                    letterSpacing: '-0.5px'
                  }}>
                CALDIM
              </h1>
             
            </div>

            {/* Login Box */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/30">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif" }}>
                  Employee Portal
                </h2>
               
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Employee ID Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Enter your employee ID"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Enter your password"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-gray-600">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-300"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#0A0F2C] to-[#4A148C] text-white py-3.5 rounded-lg font-bold hover:from-[#1A237E] hover:to-[#6A1B9A] transition-all duration-300 disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Login to Portal'
                  )}
                </button>
              </form>

              {/* Footer */}
              
            </div>

            {/* Bottom Buttons */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              {/* Holidays Calendar Button */}
              <button
                onClick={() => setShowHolidays(true)}
                className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-white/20 px-4 py-3 rounded-xl hover:from-blue-600/30 hover:to-purple-600/30 hover:border-white/40 transition-all duration-300 flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <div className="text-left">
                  <div className="text-xs text-blue-200">Holidays</div>
                  <div className="font-medium">Calendar 2026</div>
                </div>
              </button>

              {/* Today's Updates Button */}
              <button
                onClick={() => setShowUpdates(true)}
                className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-white/20 px-4 py-3 rounded-xl hover:from-blue-600/30 hover:to-purple-600/30 hover:border-white/40 transition-all duration-300 flex items-center justify-center"
              >
                <div className="relative mr-2">
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                </div>
                <div className="text-left">
                  <div className="text-xs text-blue-200">Today's</div>
                  <div className="font-medium">Updates</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Photo Gallery with About Us Button in Header */}
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
          {/* About Us Button in Top Left */}
          <div className="absolute top-10 left-10 z-30">
            <button
              onClick={() => setShowAboutUs(true)}
              className="bg-gradient-to-r from-blue-600/40 to-purple-600/40 text-white border border-white/30 px-8 py-3 rounded-full hover:from-blue-600/50 hover:to-purple-600/50 hover:border-white/50 transition-all duration-300 backdrop-blur-sm font-bold text-lg shadow-xl"
            >
              About Us
            </button>
          </div>

          <div className="absolute inset-0 bg-gradient-to-l from-black/40 to-transparent z-10"></div>
          
          {/* Slideshow */}
          <div className="relative w-full h-screen">
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${slide.url}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                </div>
                
                {/* Slide Content */}
                <div className="absolute bottom-20 left-10 right-10 text-white z-20">
                  <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif" }}>
                    {slide.title}
                  </h2>
                  <p className="text-xl text-blue-200">
                    {slide.desc}
                  </p>
                </div>
              </div>
            ))}
            
            {/* Slide Indicators */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-white w-8' 
                      : 'bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>

            {/* Next/Prev Buttons */}
            <button
              onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
              className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full z-20 transition-all duration-300 backdrop-blur-sm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
              className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full z-20 transition-all duration-300 backdrop-blur-sm"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Company Vision */}
          <div className="absolute top-10 right-10 text-right z-20">
            <div className="bg-gradient-to-l from-blue-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif" }}>
                OUR VISION
              </h3>
              <p className="text-blue-100">
                To be a pioneering global engineering solutions organization
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;