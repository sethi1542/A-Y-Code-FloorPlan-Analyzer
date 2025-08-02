import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, LogOut, CreditCard, Home, Menu, X, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar() {
    const { user, logout } = useContext(AuthContext);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [hoveredItem, setHoveredItem] = useState(null);

    return (
        <nav className="bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-black bg-opacity-90 border-b border-gray-800 fixed w-full z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Logo/Brand */}
                    <div className="flex items-center">
                        <Link 
                            to="/" 
                            className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500"
                        >
                            FloorPlan Analyzer
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {user ? (
                            <>
                                <NavItem 
                                    to="/" 
                                    icon={<Home className="h-5 w-5" />} 
                                    text="Home"
                                    hovered={hoveredItem === 'home'}
                                    onHover={() => setHoveredItem('home')}
                                    onLeave={() => setHoveredItem(null)}
                                />
                                <NavItem 
                                    to="/dashboard" 
                                    icon={<LayoutDashboard className="h-5 w-5" />} 
                                    text="Dashboard"
                                    hovered={hoveredItem === 'dashboard'}
                                    onHover={() => setHoveredItem('dashboard')}
                                    onLeave={() => setHoveredItem(null)}
                                />
                                <NavItem 
                                    to="/subscription" 
                                    icon={<CreditCard className="h-5 w-5" />} 
                                    text="Subscription"
                                    hovered={hoveredItem === 'subscription'}
                                    onHover={() => setHoveredItem('subscription')}
                                    onLeave={() => setHoveredItem(null)}
                                />
                                <div className="relative group ml-2">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-0 group-hover:opacity-75 transition duration-200"></div>
                                    <button
                                        onClick={logout}
                                        className="relative flex items-center px-4 py-2 bg-gray-800 rounded-full text-gray-300 hover:text-white group-hover:bg-gray-700 transition-all"
                                    >
                                        <User className="h-5 w-5 mr-2" />
                                        <span className="text-sm font-medium">{user.username}</span>
                                        <LogOut className="h-5 w-5 ml-2" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <NavItem 
                                    to="/" 
                                    icon={<Home className="h-5 w-5" />} 
                                    text="Home"
                                    hovered={hoveredItem === 'home'}
                                    onHover={() => setHoveredItem('home')}
                                    onLeave={() => setHoveredItem(null)}
                                />
                                <NavItem 
                                    to="/login" 
                                    text="Login"
                                    hovered={hoveredItem === 'login'}
                                    onHover={() => setHoveredItem('login')}
                                    onLeave={() => setHoveredItem(null)}
                                />
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-0 group-hover:opacity-75 transition duration-200"></div>
                                    <Link
                                        to="/signup"
                                        className="relative px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white text-sm font-medium group-hover:from-blue-500 group-hover:to-purple-500 transition-all"
                                    >
                                        Sign Up
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <motion.button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none"
                        >
                            {mobileMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:hidden bg-gray-900 border-t border-gray-800"
                >
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {user ? (
                            <>
                                <MobileNavItem 
                                    to="/" 
                                    icon={<Home className="h-5 w-5" />} 
                                    text="Home" 
                                    onClick={() => setMobileMenuOpen(false)}
                                />
                                <MobileNavItem 
                                    to="/dashboard" 
                                    icon={<LayoutDashboard className="h-5 w-5" />} 
                                    text="Dashboard" 
                                    onClick={() => setMobileMenuOpen(false)}
                                />
                                <MobileNavItem 
                                    to="/subscription" 
                                    icon={<CreditCard className="h-5 w-5" />} 
                                    text="Subscription" 
                                    onClick={() => setMobileMenuOpen(false)}
                                />
                                <button
                                    onClick={() => {
                                        logout();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-md"
                                >
                                    <LogOut className="h-5 w-5 mr-3" />
                                    <span>Logout</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <MobileNavItem 
                                    to="/" 
                                    icon={<Home className="h-5 w-5" />} 
                                    text="Home" 
                                    onClick={() => setMobileMenuOpen(false)}
                                />
                                <MobileNavItem 
                                    to="/login" 
                                    text="Login" 
                                    onClick={() => setMobileMenuOpen(false)}
                                />
                                <MobileNavItem 
                                    to="/signup" 
                                    text="Sign Up" 
                                    onClick={() => setMobileMenuOpen(false)}
                                    highlight
                                />
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </nav>
    );
}

// Reusable component for desktop navigation links
const NavItem = ({ to, icon, text, hovered, onHover, onLeave }) => (
    <motion.div 
        whileHover={{ scale: 1.05 }}
        className="relative"
        onHoverStart={onHover}
        onHoverEnd={onLeave}
    >
        <Link 
            to={to} 
            className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all ${hovered ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            {icon && <span className="mr-2">{icon}</span>}
            <span>{text}</span>
        </Link>
        {hovered && (
            <motion.div 
                layoutId="navHover"
                className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 to-purple-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.25 }}
            />
        )}
    </motion.div>
);

// Reusable component for mobile navigation links
const MobileNavItem = ({ to, icon, text, onClick, highlight }) => (
    <motion.div
        whileTap={{ scale: 0.98 }}
    >
        <Link
            to={to}
            onClick={onClick}
            className={`flex items-center px-3 py-3 rounded-md text-base font-medium ${highlight ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
        >
            {icon && <span className="mr-3">{icon}</span>}
            <span>{text}</span>
        </Link>
    </motion.div>
);