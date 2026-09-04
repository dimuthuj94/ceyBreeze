import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";

// Components
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
/* import CustomerLayout from "./components/CustomerLayout"; */
import CustomerLayout from "./components/layouts/customer/CustomerLayout";

// Website Pages
import Home from "./pages/Home";
import Tours from "./pages/Tours";
import BookNow from "./pages/BookNow";
import PresetTours from "./pages/booknow/PresetTours";
import CustomTours from "./pages/booknow/CustomTours"; 
import VehicleBookings from "./pages/booknow/VehicleBookings";// ✅ Added
import Gallery from "./pages/Gallery";
import Reviews from "./pages/Reviews";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import Privacy from "./pages/Privacy";
import CitiesAdventureActivities from "./pages/CitiesAdventureActivities";
import TermsAndConditions from "./pages/TermsAndConditions";

// Admin Pages
import AdminMainMenu from "./pages/admin/AdminMainMenu";
import AdminLogin from "./pages/login/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/admin/Users";
import AdminGallery from "./pages/admin/Gallery";
import Reports from "./pages/admin/Reports";

// Admin Pages - Content Management
import ContentManagement from "./components/layouts/admin/ContentManagement";
import NewsAndHighlights from "./pages/admin/contentManagement/NewsAndHighlights";
import ContentDashboard from "./pages/admin/contentManagement/Dashboard";
import TourManagement from "./pages/admin/contentManagement/TourManagement";
import CitiesManagement from "./pages/admin/contentManagement/CitiesAndDestinations";
import ActivitiesAndAdventure from "./pages/admin/contentManagement/ActivitiesAndAdventure";
import CarouselManager from "./pages/admin/contentManagement/CarouselManager";
import VehiclesAndAccommodations from "./pages/admin/contentManagement/VehiclesAndAccommodations";
import ManagePrices from "./pages/admin/contentManagement/ManagePrices";

// Admin Pages - Reservations Management
import ReservationDashboard from "./pages/admin/reservationManagement/Dashboard";
import ManageReservationsLayout from "./pages/admin/reservationManagement/manageReservations/ManageReservationsLayout";
import CancellationRequests from "./pages/admin/reservationManagement/CancellationRequests";
import DateChangeRequests from "./pages/admin/reservationManagement/DateChangeRequests";


// Admin Pages - Driver and Fleet Management
import FleetDashboard from "./pages/admin/driverAndFleetManagement/Dashboard";
import InternalDriversAndVehiclesLayout from "./pages/admin/driverAndFleetManagement/internalDriversAndVehicles/InternalDriversAndVehicleLayout";
import ExternalDriversAndVehiclesLayout from "./pages/admin/driverAndFleetManagement/externalDriversAndVehicles/ExternalDriversAndVehicleLayout";
import DriverStatistics from "./pages/admin/driverAndFleetManagement/DriverStatistics";
import VehicleStatistics from "./pages/admin/driverAndFleetManagement/VehicleStatistics";


// Admin Pages - Finance and Reporting
import FinanceDashboard      from "./pages/admin/financeManagement/Dashboard";
import IncomeManagement      from "./pages/admin/financeManagement/IncomeManagement";
import ExpenseManagement     from "./pages/admin/financeManagement/ExpenseManagement";
import DriverPayroll         from "./pages/admin/financeManagement/DriverPayroll";
import ExternalPayments      from "./pages/admin/financeManagement/ExternalPayments";
import VehicleCosts          from "./pages/admin/financeManagement/VehicleCosts";
import ReportsAndAnalytics   from "./pages/admin/financeManagement/ReportsAndAnalytics";
import AuditLogs             from "./pages/admin/financeManagement/AuditLogs";
import ToBeReceived         from "./pages/admin/financeManagement/TobeReceived";
import Transactions         from "./pages/admin/financeManagement/Transactions";
import CurrencyRates        from "./pages/admin/financeManagement/CurrencyRates";


// Admin Pages - Messages and Inquiries
import AdminMessagesDashboard from "./pages/admin/messagesAndInquiries/Dashboard";
import AdminDirectMessages from "./pages/admin/messagesAndInquiries/DirectMessages";
import AdminTourChats from "./pages/admin/messagesAndInquiries/TourChats";

// Admin Pages - User Management
import UserDashboard      from "./pages/admin/userManagement/Dashboard";
import AllCustomers       from "./pages/admin/userManagement/AllCustomers";
import NewRegistrations   from "./pages/admin/userManagement/NewRegistrations";
import ProfileCompletion  from "./pages/admin/userManagement/ProfileCompletion";
import CustomerBookings   from "./pages/admin/userManagement/CustomerBookings";
import ActivityLogs       from "./pages/admin/userManagement/ActivityLogs";



// Customer Pages
import CustomerLogin from "./pages/login/CustomerLogin";
import CustomerSignup from "./pages/login/CustomerSignup";
import CustomerVerifyEmail from "./pages/login/CustomerVerifyEmail";
import CustomerResetPassword from "./pages/login/CustomerReset";

// Customer Dashboard Subpages
import GiveFeedback from "./pages/customer/GiveFeedback";
import CustomerProfile from "./pages/customer/CustomerProfile";
import MyMessages from "./pages/customer/MyMessages";
import MyBookings from "./pages/customer/myBookings/MyBookings";
import Dashboard from "./pages/customer/Dashboard";
import MyReservations from "./pages/customer/myReservations/MyReservations";
import MyNotifications from "./pages/customer/MyNotifications";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Website Pages */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/tours" element={<Layout><Tours /></Layout>} />
        <Route path="/gallery" element={<Layout><Gallery /></Layout>} />
        <Route path="/reviews" element={<Layout><Reviews /></Layout>} />
        <Route path="/contact" element={<Layout><Contact /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
        <Route path="/citiesadventureactivities" element={<Layout><CitiesAdventureActivities /></Layout>} />
        <Route path="/termsandconditions" element={<Layout><TermsAndConditions /></Layout>} />

        {/* BookNow Pages - Protected for Customers */}
        <Route path="/booknow" element={<ProtectedRoute role="customer"><Layout><BookNow /></Layout></ProtectedRoute>}/>
        <Route path="/booknow/presettours" element={<ProtectedRoute role="customer"><Layout hideFooter><PresetTours /></Layout></ProtectedRoute>}/>
        <Route path="/booknow/customtours" element={<ProtectedRoute role="customer"><Layout hideFooter><CustomTours /></Layout></ProtectedRoute>}/>
        <Route path="/booknow/vehicleBookings" element={<ProtectedRoute role="customer"><Layout hideFooter><VehicleBookings /></Layout></ProtectedRoute>}/>

        {/* Admin Routes */}
        <Route path="/admin/mainmenu" element={<ProtectedRoute role="admin"><AdminMainMenu /></ProtectedRoute>}/>
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        {/* <Route path="/admin/users" element={<ProtectedRoute role="admin"><AdminUsers /></ProtectedRoute>} /> */}
        <Route path="/admin/gallery" element={<ProtectedRoute role="admin"><AdminGallery /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute role="admin"><Reports /></ProtectedRoute>} />
        
        {/* Admin Routes - Content Management */}
        <Route path="/admin/content-management/news-and-highlights" element={<ProtectedRoute role="admin"><NewsAndHighlights /></ProtectedRoute>} />
        <Route path="/admin/content-management/tours" element={<ProtectedRoute role="admin"><TourManagement /></ProtectedRoute>} />
        <Route path="/admin/content-management/cities" element={<ProtectedRoute role="admin"><CitiesManagement /></ProtectedRoute>} />
        <Route path="/admin/content-management/content-dashboard" element={<ProtectedRoute role="admin"><ContentDashboard /></ProtectedRoute>} />
        <Route path="/admin/content-management/activities" element={<ProtectedRoute role="admin"><ActivitiesAndAdventure /></ProtectedRoute>} />
        <Route path="/admin/content-management/carousel" element={<ProtectedRoute role="admin"><CarouselManager /></ProtectedRoute>} />
        <Route path="/admin/content-management/vehicles" element={<ProtectedRoute role="admin"><VehiclesAndAccommodations /></ProtectedRoute>} />
        <Route path="/admin/content-management/prices" element={<ProtectedRoute role="admin"><ManagePrices /></ProtectedRoute>} />


        {/* Admin Routes - Reservation Management */}
        <Route path="/admin/reservation/dashboard" element={<ProtectedRoute role="admin"><ReservationDashboard /></ProtectedRoute>}/>
        <Route path="/admin/reservation/manage" element={<ProtectedRoute role="admin"><ManageReservationsLayout /></ProtectedRoute>}/>
        <Route path="/admin/reservation/cancellations" element={<ProtectedRoute role="admin"><CancellationRequests /></ProtectedRoute>}/>
        <Route path="/admin/reservation/date-change-requests" element={<ProtectedRoute role="admin"><DateChangeRequests /></ProtectedRoute>}/>


        {/* Admin Routes - Driver and Fleet Management */}
        <Route path="/admin/fleet/dashboard" element={<ProtectedRoute role="admin"><FleetDashboard /></ProtectedRoute>}/>
        <Route path="/admin/fleet/internaldriversandvehicles" element={<ProtectedRoute role="admin"><InternalDriversAndVehiclesLayout/></ProtectedRoute>}/>
        <Route path="/admin/fleet/externaldriversandvehicles" element={<ProtectedRoute role="admin"><ExternalDriversAndVehiclesLayout/></ProtectedRoute>}/> 
        <Route path="/admin/fleet/driver-statistics" element={<ProtectedRoute role="admin"><DriverStatistics /></ProtectedRoute>}/>
        <Route path="admin/fleet/vehicle-statistics" element={<ProtectedRoute role="admin"><VehicleStatistics /></ProtectedRoute>}/>


        {/* Admin Routes - Finance and Reporting */}
        <Route path="/admin/finance/dashboard" element={<ProtectedRoute role="admin"><FinanceDashboard /></ProtectedRoute>}/>
        <Route path="/admin/finance/income-management" element={<ProtectedRoute role="admin"><IncomeManagement /></ProtectedRoute>}/>
        <Route path="/admin/finance/expense-management" element={<ProtectedRoute role="admin"><ExpenseManagement /></ProtectedRoute>}/>
        <Route path="/admin/finance/driver-payroll" element={<ProtectedRoute role="admin"><DriverPayroll /></ProtectedRoute>}/>
        <Route path="/admin/finance/external-payments" element={<ProtectedRoute role="admin"><ExternalPayments /></ProtectedRoute>}/>
        <Route path="/admin/finance/vehicle-costs" element={<ProtectedRoute role="admin"><VehicleCosts /></ProtectedRoute>}/>
        <Route path="/admin/finance/reports-and-analytics" element={<ProtectedRoute role="admin"><ReportsAndAnalytics /></ProtectedRoute>}/>
        <Route path="/admin/finance/audit-logs" element={<ProtectedRoute role="admin"><AuditLogs /></ProtectedRoute>}/>
        <Route path="/admin/finance/to-be-received" element={<ProtectedRoute role="admin"><ToBeReceived /></ProtectedRoute>}/>
        <Route path="/admin/finance/transactions" element={<ProtectedRoute role="admin"><Transactions /></ProtectedRoute>}/>
        <Route path="/admin/finance/currency-rates" element={<ProtectedRoute role="admin"><CurrencyRates /></ProtectedRoute>}/>


        {/* Admin Routes - Messages and Inquiries */}
        <Route path="/admin/direct-messages" element={<ProtectedRoute role="admin"><AdminDirectMessages /></ProtectedRoute>}/>
        <Route path="/admin/messagesDashboard" element={<ProtectedRoute role="admin"><AdminMessagesDashboard/></ProtectedRoute>}/>
        <Route path="/admin/tour-chats" element={<ProtectedRoute role="admin"><AdminTourChats /></ProtectedRoute>}/>


        {/* Admin Routes - User Management */}
        <Route path="/admin/user-management/users-dashboard" element={<ProtectedRoute role="admin"><UserDashboard /></ProtectedRoute>}/>
        <Route path="/admin/user-management/all-customers" element={<ProtectedRoute role="admin"><AllCustomers /></ProtectedRoute>}/>
        <Route path="/admin/user-management/new-registrations" element={<ProtectedRoute role="admin"><NewRegistrations /></ProtectedRoute>}/>
        <Route path="/admin/user-management/profile-completion" element={<ProtectedRoute role="admin"><ProfileCompletion /></ProtectedRoute>}/>
        <Route path="/admin/user-management/customer-bookings" element={<ProtectedRoute role="admin"><CustomerBookings /></ProtectedRoute>}/>
        <Route path="/admin/user-management/activity-logs" element={<ProtectedRoute role="admin"><ActivityLogs /></ProtectedRoute>}/>


        {/* Customer Authentication */}
        <Route path="/customer-signup" element={<CustomerSignup />} />
        <Route path="/customer-login" element={<CustomerLogin />} />
        <Route path="/customer-verify-email" element={<CustomerVerifyEmail />} />
        <Route path="/customer-reset-password" element={<CustomerResetPassword />} />

        {/* Customer Dashboard Routes */}
        {/* <Route path="/customer-dashboard" element={<ProtectedRoute role="customer"><CustomerLayout><CustomerDashboard /></CustomerLayout> </ProtectedRoute>} /> */}
        {/* <Route path="/customer/my-bookings" element={<ProtectedRoute role="customer"> <CustomerLayout><MyBookings /></CustomerLayout></ProtectedRoute> } /> */}
        <Route path="/customer/give-feedback"  element={<ProtectedRoute role="customer"><CustomerLayout><GiveFeedback /></CustomerLayout> </ProtectedRoute>} />
        <Route path="/customer/profile" element={<ProtectedRoute role="customer"><CustomerProfile /> </ProtectedRoute> } />
        <Route path="/customer/my-messages" element={<ProtectedRoute role="customer"><MyMessages /></ProtectedRoute> } />
        <Route path="/customer/my-bookings" element={<ProtectedRoute role="customer"><CustomerLayout><MyBookings /></CustomerLayout></ProtectedRoute>}/>
        <Route path="/customer/dashboard" element={<ProtectedRoute role="customer"><Dashboard /></ProtectedRoute>}/>
        <Route path="/customer/my-reservations" element={<ProtectedRoute role="customer"><MyReservations /></ProtectedRoute>}/>
        <Route path="/customer/my-notifications" element={<ProtectedRoute role="customer"><MyNotifications /></ProtectedRoute>}/>

        {/* 404 Page */}
        <Route
          path="*"
          element={
            <Layout>
              <h2 className="text-center mt-5">404 - Page Not Found</h2>
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;