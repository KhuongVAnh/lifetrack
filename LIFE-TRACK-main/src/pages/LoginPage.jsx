import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        if (username === 'patient123' && password === '12345') {
            navigate('/patient/dashboard');
        } else if (username === 'doctor123' && password === '12345') {
            navigate('/doctor/dashboard');
        } else {
            setError('Tài khoản hoặc mật khẩu không đúng');
        }
    };

    return (
        <>
            <style>
                {`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 8s infinite alternate;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                `}
            </style>
            <div className="min-h-screen bg-slate-50 relative flex items-center justify-center overflow-hidden font-sans">
                {/* Decorative background blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-400/30 mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-teal-400/30 mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/30 mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

                {/* Main Card */}
                <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row rounded-[2rem] overflow-hidden shadow-2xl bg-white/80 backdrop-blur-2xl border border-white m-4 min-h-[600px]">
                    {/* Left Side: Branding / Visual */}
                    <div className="hidden lg:flex flex-col justify-between w-5/12 bg-gradient-to-br from-[#004976] to-[#0070a8] text-white p-12 relative overflow-hidden shrink-0">
                        {/* Decorative pattern overlay */}
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/30 shadow-inner">
                                <span className="material-symbols-outlined text-4xl text-white drop-shadow-md">ecg_heart</span>
                            </div>
                            <h1 className="text-5xl font-black tracking-tight mb-4 drop-shadow-lg leading-tight">
                                Chăm Sóc<br />Sức Khỏe<br />Của Bạn
                            </h1>
                            <p className="text-blue-100 text-lg opacity-90 leading-relaxed font-medium">
                                Nền tảng y tế số LifeTrack, kết nối bệnh nhân và bác sĩ mọi lúc, mọi nơi một cách tiện lợi nhất.
                            </p>
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-4">
                                    <img className="w-12 h-12 rounded-full border-2 border-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyQIPZ0YXpcLBQ4HHRQXbqPbgBebedOsOe3kEoFtswdzEQ2rFfAhsJbJmoRGd1o1QZ1YSvaSIEhP1ynsnTjWDL2AyYxE8q8DxN-h12sl8gH7Ygq80nyr-HZY6HqYdCJP0UTcyPlfSdVN9eeBk0JB2bovYfKQwuPOFJibbVgI9VnEZVF9WQ53c9sVfn_BPlO8JNemXHSlCpmacFwUBCmYAWTUY_-ktp7IpAlkLYkoSZFh8lYJbb35zidTs547uAu-7yR3jZl8MLz8A" alt="" />
                                    <img className="w-12 h-12 rounded-full border-2 border-[#004976] object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBERxiI5IS-XFTWSHwFbcr2stuc50XmUYRaPVAjqMEIsF1MGdUBmBnIjU2-_TnO9sKLF5WMlpha9BUJ6hRz75l0zpJHhc_IA17CezjKyj0eymwwzv_uzzPEP6IcHdv9Dgou3RMmLf8MyGR6N74xkE45C4PHID9Kdnu_28AJ7QFMYXusU9bxG6g0d0UEM77QTW5t7mAVAt9slR_C81XwKFWnrDC6wcEcY5qo5l23-1r7CaLHTd5rYzR__KJkLc7Kf5npPB_0IYBzNSE" alt="" />
                                    <div className="w-12 h-12 rounded-full border-2 border-white bg-teal-500 flex items-center justify-center text-xs font-bold shadow-md">+5k</div>
                                </div>
                                <div className="text-xs font-medium text-blue-100">
                                    Đội ngũ y bác sĩ<br />chuyên nghiệp
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Form */}
                    <div className="w-full lg:w-7/12 p-8 sm:p-14 flex flex-col justify-center bg-white/50 relative">
                        <div className="max-w-md w-full mx-auto">
                            <div className="mb-10 text-center lg:text-left">
                                <h1 className="text-3xl font-black text-slate-800 mb-2">Đăng nhập vào <span className="text-[#004976]">LifeTrack</span></h1>
                                <p className="text-slate-500 font-medium">Nhập thông tin tài khoản của bạn để tiếp tục trải nghiệm hệ thống</p>
                            </div>

                            {error && (
                                <div className="bg-error/10 text-error border border-error/20 p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-3 animate-fade-in shadow-sm">
                                    <span className="material-symbols-outlined text-xl">error</span>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-5">
                                <div className="group">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-focus-within:text-[#004976]" htmlFor="username">
                                        Tên đăng nhập
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#004976] transition-colors">
                                            <span className="material-symbols-outlined">person</span>
                                        </div>
                                        <input
                                            id="username"
                                            type="text"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder:text-slate-400 focus:bg-white focus:border-[#004976] focus:ring-4 focus:ring-[#004976]/10 outline-none transition-all shadow-sm"
                                            placeholder="patient123 hoặc doctor123"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-slate-700 transition-colors group-focus-within:text-[#004976]" htmlFor="password">
                                            Mật khẩu
                                        </label>
                                        <a href="#reset" className="text-xs font-bold text-[#004976] hover:text-[#0070a8] hover:underline transition-all">Quên mật khẩu?</a>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#004976] transition-colors">
                                            <span className="material-symbols-outlined">lock</span>
                                        </div>
                                        <input
                                            id="password"
                                            type="password"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder:text-slate-400 focus:bg-white focus:border-[#004976] focus:ring-4 focus:ring-[#004976]/10 outline-none transition-all shadow-sm"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 mt-4 bg-[#004976] text-white rounded-xl font-bold hover:bg-[#003d63] transition-all shadow-lg shadow-[#004976]/30 hover:shadow-xl hover:shadow-[#004976]/40 hover:-translate-y-0.5 flex justify-center items-center gap-2 text-base group"
                                >
                                    Đăng nhập ngay
                                    <span className="material-symbols-outlined text-sm font-bold transition-transform group-hover:translate-x-1">arrow_forward</span>
                                </button>
                            </form>

                            <div className="mt-10 pt-8 border-t border-slate-200">
                                <p className="text-sm font-bold text-slate-500 mb-4 text-center">Hoặc chọn nhanh tài khoản thử nghiệm</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:bg-white hover:border-[#004976]/50 hover:shadow-md transition-all cursor-pointer group" onClick={() => { setUsername('patient123'); setPassword('12345'); }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="material-symbols-outlined text-[#004976] text-lg">personal_injury</span>
                                            <span className="font-bold text-sm text-slate-800 group-hover:text-[#004976] transition-colors">Bệnh nhân</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium overflow-hidden whitespace-nowrap text-ellipsis">Click để điền</p>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl hover:bg-white hover:border-[#004976]/50 hover:shadow-md transition-all cursor-pointer group" onClick={() => { setUsername('doctor123'); setPassword('12345'); }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="material-symbols-outlined text-teal-600 text-lg">stethoscope</span>
                                            <span className="font-bold text-sm text-slate-800 group-hover:text-teal-600 transition-colors">Bác sĩ</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium overflow-hidden whitespace-nowrap text-ellipsis">Click để điền</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 text-center text-xs text-slate-400 font-medium">
                                Chưa có tài khoản? <a href="#register" className="text-[#004976] font-bold hover:underline">Đăng ký ngay tại Clinic</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
