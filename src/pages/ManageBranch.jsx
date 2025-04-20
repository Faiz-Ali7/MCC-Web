import React, { useState } from 'react';
import axios from 'axios';
import './DynamicTableForm.css'; // Import the CSS file

const DynamicTableForm = () => {
    const [branch, setBranch] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [tables, setTables] = useState([]);
    const token = localStorage.getItem("token");

    // Function to create tables
    const handleTableCreation = async () => {
        if (!branch) {
            setMessage('Branch name is required.');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const response = await axios.post('http://localhost:3000/create-tables', {
                branch
            }, { headers });

            if (response.status === 200) {
                setMessage('Tables created successfully!');
            } else {
                setMessage('Error creating tables.');
            }
        } catch (error) {
            setMessage('Error: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Function to fetch tables
    const fetchTables = async () => {
        if (!token) {
            setMessage("Token is missing, please log in again.");
            return;
        }

        try {
            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const response = await axios.get('http://localhost:3000/get-tables', { headers });
            if (response.status === 200) {
                setTables(response.data.tables || []);
                setMessage('Tables fetched successfully');
            } else {
                setMessage('Error fetching tables.');
            }
        } catch (error) {
            console.error("Error fetching tables:", error);  // Log the error for debugging
            setMessage('Error fetching tables: ' + (error.response?.data?.message || error.message));
        }
    };

    // Function to delete a table
    const handleDelete = async (tableName) => {
        try {
            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const response = await axios.delete('http://localhost:3000/delete-table', {
                headers,
                data: { tableName },
            });

            setMessage(`Table ${tableName} deleted successfully!`);
            setTables(tables.filter(table => table !== tableName)); // Remove table from list
        } catch (error) {
            setMessage('Error deleting table');
        }
    };

    // Function to edit a table (optional logic)
    const handleEdit = (tableName) => {
        // Implement the editing logic here
        setMessage(`Editing table: ${tableName}`);
    };

    return (
        <div className="form-container">
            <div className="form-wrapper">
                <h1>Create Tables for New Branch</h1>

                {/* Branch name input */}
                <div className="input-container">
                    <label htmlFor="branchName">Branch Name:</label>
                    <input
                        type="text"
                        id="branchName"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="Enter branch name"
                    />
                </div>

                {/* Button to create tables */}
                <div className="button-container">
                    <button onClick={handleTableCreation} disabled={loading} className="submit-btn">
                        {loading ? 'Creating Tables...' : 'Create Tables'}
                    </button>
                </div>

                {/* Show Tables Button */}
                <div className="button-container">
                    <button onClick={fetchTables} className="submit-btn">
                        Show Tables
                    </button>
                </div>

                {/* Display message */}
                {message && <p className={`message ${loading ? 'loading' : ''}`}>{message}</p>}

                {/* Table Listing */}
                {tables.length > 0 && (
                    <table className="tables-list">
                        <thead>
                            <tr>
                                <th>Table Name</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tables.map((table) => (
                                <tr key={table}>
                                    <td>{table}</td>
                                    <td>
                                        <button onClick={() => handleEdit(table)} className="edit-btn">Edit</button>
                                        <button onClick={() => handleDelete(table)} className="delete-btn">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default DynamicTableForm;
