import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './App.css';

const UserForm = () => {
    const navigate = useNavigate(); // React Router navigation

    // State variables
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [branch, setBranch] = useState('');
    const [role, setRole] = useState('manager'); // Default role is 'manager'
    const token = localStorage.getItem("token");

    const handleRegister = async (branch, email, password, role) => {
        if (role === 'manager' && !branch.trim()) {
            console.log('Error: Please enter the branch name');
            return;
        }

        try {
            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const response = await axios.post('http://localhost:3000/register', {
                branch,
                email,
                password,
                role,
            }, { headers });

            console.log('Registration successful:', response.data);

            // Clear fields after successful registration
            setEmail('');
            setPassword('');
            setBranch('');
            setRole('manager');

            // Navigate to login screen after registration
            navigate('/login');
        } catch (error) {
            console.error('Registration Error:', error.response?.data || error.message);
        }
    };

    const handleDelete = async (email) => {
        if (!email) {
            throw new Error('Email is required to delete a user.');
        }

        try {
            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const response = await axios.delete('http://localhost:3000/delete', {
                headers,
                data: { email }
            });

            if (response.status === 200) {
                console.log('User deleted successfully.');

                // Success message (pop-up)
                alert("User deleted successfully.");

                return 'User deleted successfully.';
            } else {
                throw new Error('Failed to delete user.' || response.data.message);
            }
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    throw new Error('User not found.');
                }
                throw new Error(error.response.data.message || 'Error deleting user.');
            } else {
                throw new Error('Network error. Please try again later.');
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleRegister(branch, email, password, role); // Pass parameters correctly
    };

    const handleDeleteSubmit = (e) => {
        e.preventDefault();
        handleDelete(email); // Pass parameters correctly
    };

    return (
        <div className="user-form-container">
            <h1>Create/Modify User</h1>
            <form onSubmit={handleSubmit} className="user-form">
                <div className="form-group">
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="branch">Branch:</label>
                    <input
                        type="text"
                        id="branch"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="Enter branch name"
                        required={role === 'manager'}
                    />
                </div>

                <div className="form-group">
                    <label>Role:</label>
                    <div>
                        <input
                            type="radio"
                            id="manager"
                            name="role"
                            value="manager"
                            checked={role === 'manager'}
                            onChange={(e) => setRole(e.target.value)}
                        />
                        <label htmlFor="manager">Manager</label>

                        <input
                            type="radio"
                            id="admin"
                            name="role"
                            value="admin"
                            checked={role === 'admin'}
                            onChange={(e) => setRole(e.target.value)}
                        />
                        <label htmlFor="admin">Admin</label>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="submit-btn">Submit</button>
                    <button type="button" className="delete-btn" onClick={handleDeleteSubmit}>Delete</button>
                </div>
            </form>
        </div>
    );
};

export default UserForm;
