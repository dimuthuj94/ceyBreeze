// src/pages/admin/Users.js
import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { db, auth } from "../../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersCol = collection(db, "customers"); // Firestore collection name
      const usersSnap = await getDocs(usersCol);
      const usersData = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(), // Expecting fields like name, email, role, uid, etc.
      }));
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "customers", userId));
      alert("User deleted successfully.");
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Failed to delete user.");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <AdminLayout>
      <h2>Users Management</h2>
      <p>View and manage all users of your website.</p>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <table className="table table-striped mt-3">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>UID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-muted">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user, idx) => (
                <tr key={user.id}>
                  <td>{idx + 1}</td>
                  <td>{user.name || "N/A"}</td>
                  <td>{user.email || "N/A"}</td>
                  <td>{user.role || "Customer"}</td>
                  <td>{user.uid || "N/A"}</td>
                  <td>
                    <button className="btn btn-sm btn-primary me-2">Edit</button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </AdminLayout>
  );
}
