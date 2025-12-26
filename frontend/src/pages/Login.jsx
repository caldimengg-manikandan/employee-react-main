import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import LoginAnnouncements from '../components/LoginAnnouncements';

const Login = () => {
  const [formData, setFormData] = useState({
    employeeId: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
  const canvasRef = useRef(null);

  // Company history slideshow images
  const slides = [
    { url: "/images/12.jpeg", title: "Hosur Office", desc: "" },
    { url: "/images/13.jpeg", title: "Chennai Office", desc: "" },
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
    },
    
   
  ];


  // Holiday Calendar 2026 data
  const holidays2026 = [
    { date: '01-Jan-26', day: 'THURSDAY', occasion: 'NEW YEAR' },
    { date: '15-Jan-26', day: 'THURSDAY', occasion: 'THAI PONGAL' },
    { date: '16-Jan-26', day: 'FRIDAY', occasion: 'MATTU PONGAL' },
    { date: '26-Jan-26', day: 'MONDAY', occasion: 'REPUBLIC DAY' },
    { date: '14-Apr-26', day: 'TUESDAY', occasion: 'TAMIL NEW YEAR' },
    { date: '01-May-26', day: 'FRIDAY', occasion: 'LABOUR DAY' },
    { date: '14-Sep-26', day: 'MONDAY', occasion: 'VINAYAGAR CHATHURTHI' },
    { date: '02-Oct-26', day: 'FRIDAY', occasion: 'GANDHI JAYANTHI' },
    { date: '19-Oct-26', day: 'MONDAY', occasion: 'AYUDHA POOJA' },
    { date: 'REGIONAL', day: 'CHOOSE ONE', occasion: 'REGIONAL HOLIDAY (TELUGU NEW YEAR / GOOD FRIDAY / BAKRID / CHRISTMAS)' }
  ];

  

  // Today's Updates data
  const todaysUpdates = [
    
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

  // Animated background particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    // Particle class
    class Particle {
      constructor() {
        this.reset();
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = `rgba(${Math.floor(Math.random() * 100 + 155)}, ${Math.floor(Math.random() * 100 + 155)}, 255, ${Math.random() * 0.3 + 0.1})`;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Reset particle if it goes off screen
        if (this.x > canvas.width || this.x < 0 || this.y > canvas.height || this.y < 0) {
          this.reset();
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles
    const createParticles = () => {
      particles = [];
      for (let i = 0; i < 150; i++) {
        particles.push(new Particle());
      }
    };

    // Draw connections between particles
    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.strokeStyle = `rgba(100, 150, 255, ${0.1 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 15, 44, 0.3)');
      gradient.addColorStop(1, 'rgba(74, 20, 140, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      drawConnections();

      // Draw floating geometric shapes
      drawFloatingShapes();

      animationFrameId = requestAnimationFrame(animate);
    };

    // Draw floating geometric shapes
    const drawFloatingShapes = () => {
      const time = Date.now() * 0.001;

      // Draw rotating triangles
      ctx.save();
      ctx.translate(canvas.width * 0.2, canvas.height * 0.3);
      ctx.rotate(time * 0.2);
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 * i) / 3;
        const x = Math.cos(angle) * 40;
        const y = Math.sin(angle) * 40;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Draw rotating squares
      ctx.save();
      ctx.translate(canvas.width * 0.8, canvas.height * 0.7);
      ctx.rotate(-time * 0.2);
      ctx.strokeStyle = 'rgba(150, 100, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-30, -30, 60, 60);
      ctx.restore();

      // Draw circles
      ctx.save();
      ctx.translate(canvas.width * 0.4, canvas.height * 0.8);
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.05)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 20 + i * 15, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    };

    // Initialize
    resizeCanvas();
    createParticles();
    animate();

    // Event listeners
    window.addEventListener('resize', resizeCanvas);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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
          <h2 className="text-2xl font-bold text-white text-center">
            About CALDIM Engineering
          </h2>
          <button
            onClick={() => setShowAboutUs(false)}
            className="absolute right-6 top-6 text-white hover:text-blue-300 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {/* Services */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Our Services</h3>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-2">Our Vision</h3>
              <p className="text-blue-100">
                To be a pioneering global engineering solutions organization, driving innovation and excellence in construction, manufacturing and automotive industries.
              </p>
            </div>
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-2">Our Mission</h3>
              <p className="text-blue-100">
                To be the premium partner of choice, delivering innovative and reliable engineering solutions that empower all industries to achieve excellence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Holidays Modal
  const HolidaysModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-white/20">
          <h2 className="text-2xl font-bold text-white text-center">
           CALDIM HOLIDAY LIST 2026
          </h2>
          <button
            onClick={() => setShowHolidays(false)}
            className="absolute right-6 top-6 text-white hover:text-blue-300 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {holidays2026.map((holiday, index) => (
              <div 
                key={index} 
                className="bg-white/10 border border-white/10 rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-3xl font-bold text-white/20">{(index + 1).toString().padStart(2, '0')}</span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-200 text-xs rounded-full border border-blue-500/30">
                    {holiday.day}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-1">{holiday.date}</h3>
                <p className="text-blue-100 font-medium border-t border-white/10 pt-2 mt-2">
                  {holiday.occasion}
                </p>
              </div>
            ))}
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
          <h2 className="text-2xl font-bold text-white">
            UPCOMING EVENTS
          </h2>
          <button
            onClick={() => setShowUpdates(false)}
            className="absolute right-6 top-6 text-white hover:text-blue-300 text-xl"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {todaysUpdates.map((update) => (
              <div key={update.id} className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 rounded-xl p-5 border border-white/10">
                <div className="flex items-start">
                  <div className={`mr-4 mt-1 w-3 h-3 rounded-full ${update.priority === 'high' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">{update.title}</h3>
                    <p className="text-blue-100 mb-3">{update.description}</p>
                    <span className="text-sm text-blue-300">{update.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6">
            <LoginAnnouncements />
          </div>
          
          {/* Footer at Bottom Left */}
          <div className="absolute bottom-12 left-0 p-4 lg:p-6 z-20">
            <p className="text-white/60 text-xs">
              © 2026 CALDIM Engineering Pvt. Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // Forgot Password Component
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A0F2C] via-[#1A237E] to-[#4A148C]">
        <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#0A0F2C] mb-2">
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
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      value={forgotPasswordData.newPassword}
                      onChange={handleForgotPasswordChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
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
                onClick={() => setShowForgotPassword(false)}
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
        {/* Left Side - Animated Login Background */}
        <div className="w-full lg:w-1/2 relative overflow-hidden">
          {/* Animated Canvas Background */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
          
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            {/* Floating particles container */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400 rounded-full animate-float"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    opacity: Math.random() * 0.3 + 0.1
                  }}
                />
              ))}
            </div>

            {/* Animated grid lines */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(90deg, transparent 95%, rgba(100, 150, 255, 0.3) 100%),
                  linear-gradient(180deg, transparent 95%, rgba(100, 150, 255, 0.3) 100%)
                `,
                backgroundSize: '50px 50px',
                animation: 'gridMove 20s linear infinite'
              }} />
            </div>

            {/* Pulsing circles */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64">
              <div className="absolute inset-0 border-2 border-blue-400/20 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
              <div className="absolute inset-8 border-2 border-purple-400/20 rounded-full animate-ping" style={{ animationDuration: '6s', animationDelay: '1s' }} />
            </div>

            {/* Scanning line */}
            {/* <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-scan" /> */}
          </div>

          {/* Login Box Container */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-top p-4 lg:p-8">
            <h1 className="text-8xl font-bold text-white mt-2 tracking-tight">
                  CALDIM
                </h1>
            {/* Logo at Top Left */}
            <div className="absolute top-0 left-0 p-4 lg:p-6 z-20">
              
              <div className="flex flex-col items-start">
                <img
                  src="/images/steel-logo.png"
                  alt="caldim"
                  className="h-auto w-full max-w-[180px] object-contain"
              
                  
                />

                
              </div>
              
            </div>

              <div className="w-full max-w-md mt-20">
                {/* Header */}
                

                

                {/* Login Box */}
                <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/30 hover:border-white/50 transition-all duration-300">
                
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">
                      EMPLOYEE PORTAL
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
                      className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-blue-400"
                      placeholder="Enter your employee ID"
                    />
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-white/80 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:border-blue-400 pr-10"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                      >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
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
                    className="w-full bg-gradient-to-r from-[#0A0F2C] to-[#4A148C] text-white py-3.5 rounded-lg font-bold hover:from-[#1A237E] hover:to-[#6A1B9A] transition-all duration-300 disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-[1.02] transform"
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
                      'Sign In'
                    )}
                  </button>
                </form>
              </div>

              {/* Bottom Buttons */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                {/* Holidays Calendar Button */}
                <button
                  onClick={() => setShowHolidays(true)}
                  className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-white/20 px-4 py-3 rounded-xl hover:from-blue-600/30 hover:to-purple-600/30 hover:border-white/40 transition-all duration-300 flex items-center justify-center hover:scale-[1.02] transform backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 mr-2 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <div className="text-left">
                   
                    <div className="font-medium">CALDIM HOLIDAY'S</div>
                  </div>
                </button>

                {/* Today's Updates Button */}
                <button
                  onClick={() => setShowUpdates(true)}
                  className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-white/20 px-4 py-3 rounded-xl hover:from-blue-600/30 hover:to-purple-600/30 hover:border-white/40 transition-all duration-300 flex items-center justify-center hover:scale-[1.02] transform backdrop-blur-sm"
                >
                  <div className="relative mr-2">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-centre">
                    <div className="text-xs text-blue-100"></div>
                    <div className="font-small">UPCOMING EVENTS</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-50">
            <LoginAnnouncements title="📢 Company Announcements" mode="ticker" />
          </div>
        </div>

        {/* Right Side - Photo Gallery */}
        <div 
          className="hidden lg:block lg:w-1/2 relative overflow-hidden"
          style={{ 
            maskImage: 'linear-gradient(to right, transparent, white 100px)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, white 100px)'
          }}
        >
          {/* Footer at Bottom Right (moved from left) */}
          <div className="absolute bottom-12 right-0 p-4 lg:p-6 z-20 text-right">
            <p className="text-white/60 text-xs">
              © 2026 CALDIM Engineering Pvt. Ltd. All rights reserved.
            </p>
          </div>

          {/* About Us Button */}
          <div className="absolute top-10 right-10 z-30">
            <button
              onClick={() => setShowAboutUs(true)}
              className="bg-gradient-to-r from-blue-600/40 to-purple-600/40 text-white border border-white/30 px-6 py-3 rounded-full hover:from-blue-600/50 hover:to-purple-600/50 hover:border-white/50 transition-all duration-300 backdrop-blur-sm font-bold shadow-xl hover:scale-105 transform flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
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
                  <h2 className="text-5xl font-bold mb-4">
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
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-marquee {
          animation: marquee 60s linear infinite;
          display: inline-flex;
        }
        
        .animate-marquee:hover {
          animation-play-state: paused;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }

        @keyframes gridMove {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }

        @keyframes scan {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }

        .animate-float {
          animation: float 8s ease-in-out infinite;
        }

        .animate-grid {
          animation: gridMove 20s linear infinite;
        }

        .animate-scan {
          animation: scan 3s linear infinite;
        }

        .animate-ping {
          animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};

export default Login;