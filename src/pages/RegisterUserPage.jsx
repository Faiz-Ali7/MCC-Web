import React, { useState } from 'react';
import axios from 'axios';
import './UserForm.css'; 

const UserForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [branch, setBranch] = useState('');
    const [role, setRole] = useState('manager'); 
    const [message, setMessage] = useState('');
    const token = localStorage.getItem("token");

    const handleRegister = async (branch, email, password, role) => {
        if (role === 'manager' && !branch.trim()) {
            setMessage('Branch name is required for Manager role.');
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

            setMessage('Registration successful!');

            // Clear fields after successful registration
            setEmail('');
            setPassword('');
            setBranch('');
            setRole('manager');
        } catch (error) {
            setMessage('Error: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleRegister(branch, email, password, role); // Pass parameters correctly
    };

    return (
        <div className="form-container">
            <div className="form-wrapper">
                <h1 className="H1">Create/Modify User</h1>
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
                        <div className="role-options">
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
                    </div>
                </form>

                {message && <p className="message">{message}</p>}
            </div>
        </div>
    );
};

export default UserForm;
