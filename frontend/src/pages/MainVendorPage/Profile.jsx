import React, { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Save, Loader } from "lucide-react";
import {
  getMainVendorProfile,
  updateMainVendorProfile,
} from "../../api/mainVendorApi";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { updateVendorProfileData } from "../../redux/slices/vendorAuthSlice";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import BackButton from "../../components/Common/BackButton";

function Profile() {
  const dispatch = useDispatch();
  const { vendorId } = useSelector((state) => state.vendorAuth);
  const fallbackVendorId = sessionStorage.getItem("vendorId");
  const currentVendorId = vendorId || fallbackVendorId;

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
  });

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentVendorId) return;
      try {
        const res = await getMainVendorProfile(currentVendorId);
        if (res.status && res.vendor) {
          const { name, email, phone, address, city, state } = res.vendor;
          setProfile({
            name: name || "",
            email: email || "",
            phone: phone || "",
            address: address || "",
            city: city || "",
            state: state || "",
          });

          // Sync with Redux if necessary
          dispatch(
            updateVendorProfileData({
              name,
              photo: res.vendor.profilePic,
              phone,
              address,
              city,
              state,
            }),
          );
        }
      } catch (err) {
        toast.error("Failed to load profile data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentVendorId, dispatch]);

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentVendorId) return;

    setIsUpdating(true);
    try {
      const res = await updateMainVendorProfile(currentVendorId, profile);
      if (res.status) {
        toast.success("Profile updated successfully!");
        // Update Redux Store
        dispatch(
          updateVendorProfileData({
            name: profile.name,
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
            state: profile.state,
          }),
        );
      } else {
        toast.error(res.message || "Failed to update profile");
      }
    } catch (err) {
      toast.error("Error updating profile");
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Profile..." />;
  }

  return (
    <div className="profile">
      <div className="content-header">
        <div className="header-top">
          <h1>Profile Management</h1>
          <BackButton />
        </div>
        <div className="breadcrumb">
          <span>Vendor</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span>Profile</span>
        </div>
      </div>

      <div className="content-body">
        <div className="data-card">
          <div className="data-card-header">
            <div>
              <div className="data-card-title">Personal Information</div>
              <div className="data-card-subtitle">
                Update your profile details
              </div>
            </div>
            <User size={24} />
          </div>
          <div className="data-card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <User size={16} /> Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={profile.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Mail size={16} /> Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={profile.email}
                    onChange={handleChange}
                    required
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Phone size={16} /> Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="form-control"
                    value={profile.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <MapPin size={16} /> Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    className="form-control"
                    value={profile.address}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    name="city"
                    className="form-control"
                    value={profile.city}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    name="state"
                    className="form-control"
                    value={profile.state}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="data-card-footer">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader className="animate-spin" size={16} /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
