// components/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import Sidebar from './layout/Sidebar';
import { 
  Car, 
  User, 
  UsersRound, 
  TrendingUp, 
  Clock, 
  Calendar, 
  ArrowLeft,
  Activity,
  BarChart2,
  Filter,
  Bell,
  MessageSquare,
  Star,
  X,
  Check,
  AlertTriangle,
  DollarSign,
  FileText
} from 'lucide-react';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalCars: 0,
    totalOwners: 0,
    totalCustomers: 0,
    availableCars: 0,
    totalBookings: 0,
    totalFeedbacks: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  
  const navigate = useNavigate();
  const db = getFirestore();
  
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  
  // Function to add a new notification
  const addNotification = useCallback((message, type = 'info') => {
    const newNotification = {
      id: Date.now(), // unique ID based on timestamp
      message,
      time: 'Just now',
      read: false,
      type // 'info', 'warning', or 'error'
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setNotificationCount(prev => prev + 1);
    
    return newNotification.id; // return the ID so it can be referenced later
  }, []);
  
  // Function to remove a notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setNotificationCount(prev => Math.max(0, prev - 1));
  }, []);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch vehicles data
        const vehiclesQuery = collection(db, 'vehicles');
        const vehiclesSnapshot = await getDocs(vehiclesQuery);
        const vehiclesData = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalCars = vehiclesData.length;
        const availableCars = vehiclesData.filter(car => car.status === 'Available').length;
        
        // Fetch users data
        const usersCollection = collection(db, 'users');
        
        // Get owners
        const ownersQuery = query(usersCollection, where('role', '==', 'owner'));
        const ownersSnapshot = await getDocs(ownersQuery);
        const ownersData = ownersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalOwners = ownersData.length;
        
        // Get customers
        const customersQuery = query(usersCollection, where('role', '==', 'customer'));
        const customersSnapshot = await getDocs(customersQuery);
        const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalCustomers = customersData.length;
        
        // Fetch bookings data
        const bookingsQuery = query(
          collection(db, 'bookings'),
          orderBy('timestamp', 'desc')
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const totalBookings = bookingsData.length;
        
        // Get recent bookings
        const recentBookingsQuery = query(
          collection(db, 'bookings'), 
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const recentBookingsSnapshot = await getDocs(recentBookingsQuery);
        const recentBookingsData = recentBookingsSnapshot.docs.map(doc => {
          const booking = { id: doc.id, ...doc.data() };
          
          // Format dates if they exist
          if (booking.startDate) {
            booking.startDateFormatted = new Date(booking.startDate).toLocaleDateString();
          }
          
          if (booking.endDate) {
            booking.endDateFormatted = new Date(booking.endDate).toLocaleDateString();
          }
          
          return booking;
        });
        
        setRecentBookings(recentBookingsData);
        
        // Try to fetch feedbacks if they exist
        let feedbackCount = 0;
        try {
          const feedbacksQuery = query(
            collection(db, 'feedbacks'),
            orderBy('createdAt', 'desc'),
            limit(3)
          );
          const feedbacksSnapshot = await getDocs(feedbacksQuery);
          const feedbacksData = feedbacksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFeedbacks(feedbacksData);
          feedbackCount = feedbacksData.length;
        } catch (error) {
          console.log('No feedbacks collection found or other error:', error);
          // Use empty array if no feedbacks collection
          setFeedbacks([]);
        }
        
        // Create notifications based on recent activity
        const newNotifications = [];
        
        // Add notification for recent bookings
        recentBookingsData.slice(0, 3).forEach((booking, index) => {
          newNotifications.push({
            id: `booking-${booking.id}`,
            message: `New booking: ${booking.vehicleBrand || 'Vehicle'} ${booking.vehicleModel || ''} by ${booking.name || 'Customer'}`,
            time: booking.timestamp ? new Date(booking.timestamp.seconds * 1000).toLocaleString() : `${index + 1} hours ago`,
            read: false,
            type: 'info'
          });
        });
        
        // Add notification for cars with low availability
        if (availableCars < 3) {
          newNotifications.push({
            id: 'low-availability',
            message: `Low vehicle availability alert: Only ${availableCars} vehicles available`,
            time: 'Today',
            read: false,
            type: 'warning'
          });
        }
        
        setNotifications(newNotifications);
        setNotificationCount(newNotifications.length);
        
        // Set all stats
        setStats({
          totalCars,
          totalOwners,
          totalCustomers,
          availableCars,
          totalBookings,
          totalFeedbacks: feedbackCount
        });
        
        // Finish loading
        setLoading(false);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [db]);

  // Add custom styles for the dashboard
  useEffect(() => {
    const styles = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(20px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(45, 55, 72, 0.3);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(45, 55, 72, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(45, 55, 72, 0);
        }
      }
      
      .card-glassmorphism {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      }
      
      .card-glassmorphism-dark {
        background: rgba(45, 55, 72, 0.7);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }
      
      .bg-pattern {
        background-color: #f5f5f5;
        background-image: radial-gradient(#e0e0e0 1px, transparent 1px);
        background-size: 20px 20px;
      }
      
      .animate-fadeIn {
        animation: fadeIn 0.5s ease-out forwards;
      }
      
      .animate-slideUp {
        animation: slideUp 0.5s ease-out forwards;
      }
      
      .animate-pulse-subtle {
        animation: pulse 2s infinite;
      }
      
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 10px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
      }
      
      .stat-card {
        transition: all 0.3s ease;
      }
      
      .stat-card:hover {
        transform: translateY(-5px);
      }
      
      .stat-icon {
        transition: all 0.3s ease;
      }
      
      .stat-card:hover .stat-icon {
        transform: scale(1.1);
      }
      
      .table-row {
        transition: all 0.2s ease;
      }
      
      .table-row:hover {
        background-color: rgba(243, 244, 246, 0.7);
      }

      .notification-item {
        transition: all 0.2s ease;
      }
      
      .notification-item:hover {
        background-color: rgba(243, 244, 246, 0.7);
      }
      
      @keyframes notification-pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
        }
        70% {
          box-shadow: 0 0 0 6px rgba(59, 130, 246, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
        }
      }
      
      .notification-pulse {
        animation: notification-pulse 2s infinite;
      }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  
  // Function to get status color and text
  const getStatusDisplay = (status) => {
    switch(status?.toLowerCase()) {
      case 'active':
      case 'confirmed':
        return { bgColor: 'bg-green-100', textColor: 'text-green-800', text: 'Active' };
      case 'completed':
        return { bgColor: 'bg-blue-100', textColor: 'text-blue-800', text: 'Completed' };
      case 'cancelled':
        return { bgColor: 'bg-red-100', textColor: 'text-red-800', text: 'Cancelled' };
      case 'pending':
        return { bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', text: 'Pending' };
      default:
        return { bgColor: 'bg-gray-100', textColor: 'text-gray-800', text: status || 'Unknown' };
    }
  };

  return (
    <div className="flex h-screen bg-pattern">
      <Sidebar currentPage="dashboard" />
      
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'ml-0' : 'ml-0 lg:ml-64'}`}>
        {/* Top Bar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button 
                onClick={toggleSidebar}
                className="mr-4 p-1 rounded-md text-gray-500 hover:text-gray-700 focus:outline-none lg:hidden"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center text-sm text-gray-500">
                <Clock size={16} className="mr-1" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              
              <div className="relative">
                <button className="p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none">
                  <Filter size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
          <div className="container px-4 sm:px-6 py-8 mx-auto">
            {/* Dashboard Header */}
            <div className="mb-8 animate-fadeIn">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Car Rental Dashboard</h2>
              <p className="text-gray-500">Overview of rental activity and statistics</p>
            </div>
            
            {loading ? (
              <div className="flex justify-center my-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700"></div>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Total Cars */}
                  <div onClick={() => navigate('/cars')} className="cursor-pointer">
                    <div className="card-glassmorphism rounded-lg overflow-hidden stat-card animate-slideUp" style={{ animationDelay: '0ms' }}>
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h6 className="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase">Total Cars</h6>
                            <span className="text-4xl font-semibold text-gray-800">{stats.totalCars}</span>
                            <div className="mt-1">
                              <span className="inline-block px-2 py-1 text-xs text-green-700 bg-green-100 rounded-md">
                                {stats.availableCars} Available
                              </span>
                            </div>
                          </div>
                          <div className="p-3 bg-gray-200 rounded-full stat-icon">
                            <Car size={24} className="text-gray-700" />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex items-center text-xs text-gray-500">
                            <TrendingUp size={14} className="mr-1 text-green-500" />
                            <span>Manage vehicle inventory</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Owners */}
                  <div onClick={() => navigate('/owners')} className="cursor-pointer">
                    <div className="card-glassmorphism rounded-lg overflow-hidden stat-card animate-slideUp" style={{ animationDelay: '100ms' }}>
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h6 className="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase">Car Owners</h6>
                            <span className="text-4xl font-semibold text-gray-800">{stats.totalOwners}</span>
                            <div className="mt-1">
                              <span className="inline-block px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded-md">
                                {stats.totalOwners > 0 ? '⭐ Active' : 'No owners'}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 bg-gray-200 rounded-full stat-icon">
                            <UsersRound size={24} className="text-gray-700" />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex items-center text-xs text-gray-500">
                            <TrendingUp size={14} className="mr-1 text-green-500" />
                            <span>View owner details</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Customers */}
                  <div onClick={() => navigate('/renters')} className="cursor-pointer">
                    <div className="card-glassmorphism rounded-lg overflow-hidden stat-card animate-slideUp" style={{ animationDelay: '200ms' }}>
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h6 className="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase">Customers</h6>
                            <span className="text-4xl font-semibold text-gray-800">{stats.totalCustomers}</span>
                            <div className="mt-1">
                              <span className="inline-block px-2 py-1 text-xs text-purple-700 bg-purple-100 rounded-md">
                                {stats.totalCustomers > 0 ? '⭐ Active' : 'No customers'}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 bg-gray-200 rounded-full stat-icon">
                            <User size={24} className="text-gray-700" />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex items-center text-xs text-gray-500">
                            <TrendingUp size={14} className="mr-1 text-green-500" />
                            <span>View customer profiles</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Bookings */}
                  <div onClick={() => navigate('/bookings')} className="cursor-pointer">
                    <div className="card-glassmorphism rounded-lg overflow-hidden stat-card animate-slideUp" style={{ animationDelay: '300ms' }}>
                      <div className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h6 className="text-xs font-medium leading-none tracking-wider text-gray-500 uppercase">Total Bookings</h6>
                            <span className="text-4xl font-semibold text-gray-800">{stats.totalBookings}</span>
                            <div className="mt-1">
                              <span className="inline-block px-2 py-1 text-xs text-orange-700 bg-orange-100 rounded-md">
                                {recentBookings.length > 0 ? `${recentBookings.length} recent` : 'No bookings'}
                              </span>
                            </div>
                          </div>
                          <div className="p-3 bg-gray-200 rounded-full stat-icon">
                            <FileText size={24} className="text-gray-700" />
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <div className="flex items-center text-xs text-gray-500">
                            <TrendingUp size={14} className="mr-1 text-green-500" />
                            <span>Manage booking records</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Recent Bookings Section */}
                  <div className="lg:col-span-2 animate-fadeIn" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">Recent Bookings</h4>
                      <button 
                        onClick={() => navigate('/reports')}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View All
                      </button>
                    </div>
                    
                    <div className="card-glassmorphism rounded-lg overflow-hidden">
                      {recentBookings.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="bg-gray-50 bg-opacity-80">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Vehicle
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Customer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Dates
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Price
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentBookings.map((booking) => {
                                const statusDisplay = getStatusDisplay(booking.status);
                                return (
                                  <tr key={booking.id} className="table-row">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                          <Car size={16} className="text-gray-600" />
                                        </div>
                                        <div className="ml-4">
                                          <div className="text-sm font-medium text-gray-900">
                                            {booking.vehicleBrand} {booking.vehicleModel}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {booking.transmission}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900">{booking.name}</div>
                                      <div className="text-xs text-gray-500">{booking.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-500 flex items-center">
                                        <Calendar size={14} className="mr-1" />
                                        {booking.startDateFormatted}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        Return: {booking.endDateFormatted}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-900 flex items-center">
                                        <DollarSign size={14} className="mr-1" />
                                        ₱{booking.price?.toLocaleString() || 'N/A'}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusDisplay.bgColor} ${statusDisplay.textColor}`}>
                                        {statusDisplay.text}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <Calendar size={24} className="text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
                          <p className="text-gray-500 mb-4">
                            There are no recent bookings in the system
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Feedback Section - Removed since no feedback data is available */}
                  </div>
                  
                  <div className="lg:col-span-1 space-y-6">
                    {/* Notifications Section */}
                    <div className="animate-fadeIn" style={{ animationDelay: '250ms' }}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">Notifications</h4>
                        <div className="flex items-center">
                          <button 
                            className="p-1 rounded-full bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none relative mr-3"
                            onClick={() => setShowAllNotifications(!showAllNotifications)}
                          >
                            <Bell size={16} />
                            {notificationCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                {notificationCount}
                              </span>
                            )}
                          </button>
                          <button 
                            className="text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              setNotifications(notifications.map(n => ({ ...n, read: true })));
                              setNotificationCount(0);
                            }}
                          >
                            Mark all as read
                          </button>
                        </div>
                      </div>
                      
                      <div className="card-glassmorphism rounded-lg overflow-hidden">
                        <div className="p-4">
                          {notifications.length > 0 ? (
                            <div className="space-y-1">
                              {(showAllNotifications ? notifications : notifications.slice(0, 3)).map((notification) => (
                                <div 
                                  key={notification.id} 
                                  className={`p-3 rounded-md notification-item cursor-pointer flex items-start ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
                                  onClick={() => {
                                    // Mark this notification as read
                                    const updatedNotifications = notifications.map(n => 
                                      n.id === notification.id ? { ...n, read: true } : n
                                    );
                                    setNotifications(updatedNotifications);
                                    // Update unread count
                                    setNotificationCount(updatedNotifications.filter(n => !n.read).length);
                                  }}
                                >
                                  <div className={`p-2 rounded-full ${
                                    notification.type === 'warning' ? 'bg-yellow-100' :
                                    notification.type === 'error' ? 'bg-red-100' :
                                    notification.read ? 'bg-gray-100' : 'bg-blue-100'
                                  } mr-3 flex-shrink-0`}>
                                    {notification.type === 'warning' ? (
                                      <AlertTriangle size={14} className="text-yellow-600" />
                                    ) : notification.type === 'error' ? (
                                      <X size={14} className="text-red-600" />
                                    ) : (
                                      <Bell size={14} className={notification.read ? 'text-gray-600' : 'text-blue-600'} />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between">
                                      <p className={`text-sm ${notification.read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                                        {notification.message}
                                      </p>
                                      {!notification.read && (
                                        <span className="h-2 w-2 bg-blue-500 rounded-full ml-2 mt-1.5 flex-shrink-0"></span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-400">{notification.time}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-6 text-center">
                              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                <Bell size={20} className="text-gray-400" />
                              </div>
                              <p className="text-gray-500">No notifications available</p>
                            </div>
                          )}
                        </div>
                        {notifications.length > 0 && (
                          <div className="px-6 py-3 bg-gray-50 bg-opacity-80 flex justify-between items-center">
                            <button 
                              className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900 focus:outline-none"
                              onClick={() => setShowAllNotifications(!showAllNotifications)}
                            >
                              {showAllNotifications ? 'Show Less' : 'View All Notifications'}
                            </button>
                            
                            <button 
                              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 focus:outline-none"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to clear all notifications?')) {
                                  setNotifications([]);
                                  setNotificationCount(0);
                                }
                              }}
                            >
                              Clear All
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Vehicle Status Section */}
                    <div className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">Booking Status</h4>
                      </div>
                      
                      <div className="card-glassmorphism rounded-lg overflow-hidden p-6">
                        <div className="space-y-4">
                          {/* Pending */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></div>
                              <span className="text-sm text-gray-700">Pending</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {recentBookings.filter(b => b.status?.toLowerCase() === 'pending').length}
                            </span>
                          </div>
                          
                          {/* Confirmed */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
                              <span className="text-sm text-gray-700">Confirmed</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {recentBookings.filter(b => b.status?.toLowerCase() === 'confirmed').length}
                            </span>
                          </div>
                          
                          {/* Completed */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
                              <span className="text-sm text-gray-700">Completed</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {recentBookings.filter(b => b.status?.toLowerCase() === 'completed').length}
                            </span>
                          </div>
                          
                          {/* Cancelled */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full bg-red-400 mr-2"></div>
                              <span className="text-sm text-gray-700">Cancelled</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {recentBookings.filter(b => b.status?.toLowerCase() === 'cancelled').length}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <button 
                            onClick={() => navigate('/reports')}
                            className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-md shadow-sm transition duration-200"
                          >
                            View All Bookings
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;