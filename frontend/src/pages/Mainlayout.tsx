import { Outlet } from "react-router-dom";
import { LoadedHeader } from "./Dashboard";
import { Footer } from "@/components/footer/Footer";

const MainLayout = () => {
  return (
    <div className="dashboard-bg-animated min-h-screen">
      {LoadedHeader}
      <div className="fixed top-0 bottom-0 pt-20 w-screen overflow-y-auto scrollbar-hide">
        <Outlet />
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
