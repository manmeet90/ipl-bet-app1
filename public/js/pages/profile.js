const ProfilePage = {
  render() {
    const user = App.user;
    return `
      <div class="page">
        <div class="page-title">⚙ Profile</div>
        <div class="profile-card">
          <div style="margin-bottom:20px;">
            <p style="font-size:14px;color:var(--text-secondary)">Name: <strong style="color:var(--text-primary)">${user.name}</strong></p>
            <p style="font-size:14px;color:var(--text-secondary);margin-top:4px">Phone: <strong style="color:var(--text-primary)">${user.phone}</strong></p>
          </div>
          <h2>Change Password</h2>
          <div class="form-group">
            <label>Current Password</label>
            <input type="password" class="form-input" id="prof-current-pw" placeholder="Current password">
          </div>
          <div class="form-group">
            <label>New Password</label>
            <input type="password" class="form-input" id="prof-new-pw" placeholder="Min 6 characters">
          </div>
          <button class="btn btn-primary" onclick="ProfilePage.changePassword(this)">Update Password</button>
        </div>
      </div>
    `;
  },

  async changePassword(btnEl) {
    const current = document.getElementById('prof-current-pw').value;
    const newPw = document.getElementById('prof-new-pw').value;
    if (!current || !newPw) return Toast.error('Please fill in all fields');
    await Loader.btn(btnEl, async () => {
      try {
        await API.changePassword(current, newPw);
        Toast.success('Password changed!');
        document.getElementById('prof-current-pw').value = '';
        document.getElementById('prof-new-pw').value = '';
      } catch (e) {
        Toast.error(e.message);
      }
    });
  }
};
