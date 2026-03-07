import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getAccessToken, getStoredUser, setStoredUser } from "../auth/storage";
import DashboardLayout from "../components/DashboardLayout";

const buildApiOrigin = () => {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!envBaseUrl) return "http://127.0.0.1:8000";
  return envBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "");
};

const API_ORIGIN = buildApiOrigin();

const toMediaUrl = (imagePath) => {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return imagePath.startsWith("/")
    ? `${API_ORIGIN}${imagePath}`
    : `${API_ORIGIN}/${imagePath}`;
};

const ProfileOverview = () => {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const [profile, setProfile] = useState({
    fullName: storedUser.name,
    email: storedUser.email,
    profilePicture: storedUser.avatar || "",
    phone: "",
    company: "",
    role: "Administrator",
    address: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!getAccessToken()) {
          setIsLoading(false);
          return;
        }

        const res = await api.get("auth/profile/");
        const profilePicture = toMediaUrl(res.data.profilePicture || "");

        setProfile((prev) => ({
          ...prev,
          fullName: res.data.fullName ?? prev.fullName,
          email: res.data.email ?? prev.email,
          profilePicture,
          company: res.data.company ?? prev.company,
          phone: res.data.phone ?? prev.phone,
          address: res.data.address ?? prev.address,
          role: res.data.role ?? prev.role,
        }));

        setStoredUser({
          name: res.data.fullName ?? storedUser.name,
          email: res.data.email ?? storedUser.email,
          avatar: profilePicture || null,
        });
      } catch (error) {
        console.error("Failed to fetch profile overview:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Profile Overview</h2>
            <p className="text-white/70">View and manage your account information</p>
          </div>

          <button 
            onClick={() => navigate("/profile")} 
            className="group relative px-6 py-3 w-fit"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all group-hover:scale-105 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </div>
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-white mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-white/70">Loading profile...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
                {/* Profile Picture */}
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-lg opacity-50"></div>
                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-4xl overflow-hidden border-4 border-white/20">
                      {profile.profilePicture ? (
                        <img
                          src={profile.profilePicture}
                          alt={profile.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (profile.fullName?.charAt(0) || "U").toUpperCase()
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mt-4 mb-1">
                    {profile.fullName || "User"}
                  </h3>
                  <p className="text-white/60 mb-2">{profile.email || "-"}</p>
                  
                  <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    {profile.role || "Member"}
                  </span>
                </div>

                {/* Quick Stats */}
                <div className="space-y-3 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Account Status</span>
                    <span className="flex items-center gap-1 text-green-400 font-semibold">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Member Since</span>
                    <span className="text-white font-medium">Jan 2024</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Last Login</span>
                    <span className="text-white font-medium">Today</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Profile Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Personal Information</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/70">Full Name</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <p className="text-white font-medium">{profile.fullName || "-"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/70">Email Address</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <p className="text-white font-medium break-all">{profile.email || "-"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/70">Phone Number</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <p className="text-white font-medium">{profile.phone || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/70">Role</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <p className="text-white font-medium">{profile.role || "-"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white">Company Information</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/70">Company Name</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <p className="text-white font-medium">{profile.company || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/70">Address</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <p className="text-white font-medium">{profile.address || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProfileOverview;