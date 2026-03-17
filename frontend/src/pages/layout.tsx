import { Outlet } from "react-router-dom";
import Sidebar from "./playerComponents/sidebar";
import Footer from "./playerComponents/footer";

function Layout() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="passthrough-div">
        <main className="main-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default Layout;
