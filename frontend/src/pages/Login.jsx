import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import FloatingInput from '../components/Forms/FloatingInput';

const bgUrl = "https://hitechcon.in/wp-content/uploads/2021/09/Civil.jpg";

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

  const navigate = useNavigate();

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

  if (showForgotPassword) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      >
        {/* translucent overlay */}
        <div className="absolute inset-0 bg-black/50"></div>

        <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md mx-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Forgot Password</h1>
            <p className="text-gray-600">Reset your account password</p>
          </div>

          <form className="space-y-6" onSubmit={forgotPasswordStep === 1 ? handleSendOtp : handleResetPassword}>
            {forgotPasswordStep === 1 && (
              <FloatingInput
                type="text"
                name="employeeId"
                label="Employee ID"
                required
                value={forgotPasswordData.employeeId}
                onChange={handleForgotPasswordChange}
              />
            )}

            {forgotPasswordStep === 2 && (
              <>
                <FloatingInput
                  type="text"
                  name="otp"
                  label="OTP"
                  required
                  value={forgotPasswordData.otp}
                  onChange={handleForgotPasswordChange}
                />
                <FloatingInput
                  type="password"
                  name="newPassword"
                  label="New Password"
                  required
                  value={forgotPasswordData.newPassword}
                  onChange={handleForgotPasswordChange}
                />
              </>
            )}

            {forgotPasswordMessage && (
              <div className={`text-sm p-3 rounded-xl ${forgotPasswordMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {forgotPasswordMessage}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-[#262760] text-white py-3 px-6 rounded-xl font-medium hover:bg-[#1e2050] transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                {forgotPasswordStep === 1 ? 'Send OTP' : 'Reset Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordStep(1);
                  setForgotPasswordData({ email: '', otp: '', newPassword: '' });
                  setForgotPasswordMessage('');
                }}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
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
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url('${bgUrl}')` }}
    >
      {/* overlay to keep text readable */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40"></div>

      <div className="relative z-10 w-full max-w-md p-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-10 border border-gray-100">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-xl font-bold text-blue-800 mb-2">CALDIM Engineering Pvt.Ltd</h2>
            <p className="text-sm sm:text-base text-gray-600">Welcome to your portal. Sign in to your account</p>
          </div>

          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            

            <FloatingInput
              type="text"
              name="employeeId"
              label="Employee ID"
              required
              value={formData.employeeId}
              onChange={handleChange}
            />

            <FloatingInput
              type="password"
              name="password"
              label="Password"
              required
              value={formData.password}
              onChange={handleChange}
            />

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-200">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-[#262760] hover:text-[#1e2050] font-medium transition-colors duration-300"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#262760] to-[#5a59b0] text-white py-3 px-6 rounded-xl font-medium hover:from-[#1e2050] hover:to-[#4a4990] transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:transform-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  LOGIN
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
