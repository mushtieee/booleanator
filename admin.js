// admin.js
import { supabase } from './supabaseClient.js';

const ADMIN_EMAIL = 'your-admin-email@example.com'; // Change this to your email

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const adminContent = document.getElementById('adminContent');
    const authStatus = document.getElementById('authStatus');

    if (user && user.email === ADMIN_EMAIL) {
        authStatus.textContent = '';
        adminContent.classList.remove('hidden');
        fetchUsers();
        fetchAnalytics();
    } else {
        authStatus.textContent = 'Access Denied. You are not an administrator.';
    }
});

async function fetchUsers() {
    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name, is_approved, last_login');

    if (error) {
        console.error('Error fetching users:', error.message);
        return;
    }

    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = ''; // Clear table
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${user.full_name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                ${user.is_approved ? 'Approved' : 'Pending'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                ${!user.is_approved ? `<button onclick="approveUser('${user.id}')" class="text-indigo-400 hover:text-indigo-600">Approve</button>` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

window.approveUser = async (userId) => {
    const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', userId);

    if (error) {
        alert('Error approving user: ' + error.message);
    } else {
        alert('User approved!');
        fetchUsers(); // Refresh the list
    }
};
async function fetchAnalytics() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();

    // Fetch DAU
    const { count: dau } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', yesterday);

    // Fetch MAU
    const { count: mau } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', thirtyDaysAgo);

    const analyticsContainer = document.getElementById('analyticsContainer');
    analyticsContainer.innerHTML = `
        <div class="bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 class="text-gray-400 uppercase text-sm font-bold">Daily Active Users (DAU)</h3>
            <p class="text-white text-3xl font-bold mt-2">${dau}</p>
        </div>
        <div class="bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 class="text-gray-400 uppercase text-sm font-bold">Monthly Active Users (MAU)</h3>
            <p class="text-white text-3xl font-bold mt-2">${mau}</p>
        </div>
    `;
}