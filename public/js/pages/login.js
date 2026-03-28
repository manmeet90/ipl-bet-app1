const LoginPage = {
  forgotStep: 1,
  forgotPhone: '',

  render() {
    return `
      <div class="login-page">
        <div class="login-card">
          <div class="login-header">
            <div class="logo">🏏</div>
            <h1>IPL Bet 2026</h1>
            <p>Predict. Compete. Win.</p>
          </div>

          <div id="login-form">
            <div class="form-group">
              <label>Phone Number</label>
              <input type="text" class="form-input" id="login-phone" placeholder="Enter phone number" autocomplete="username">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" class="form-input" id="login-password" placeholder="Enter password" autocomplete="current-password">
            </div>
            <button class="btn btn-gold" onclick="LoginPage.doLogin(this)">Sign In</button>
            <div class="login-footer">
              <small style="color:var(--text-muted)">Forgot password? Contact your admin.</small>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  showForgot() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('forgot-form').style.display = 'block';
    document.getElementById('forgot-step-1').classList.add('active');
    document.getElementById('forgot-step-2').classList.remove('active');
  },

  showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('forgot-form').style.display = 'none';
  },

  async doLogin(btnEl) {
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;
    if (!phone || !password) return Toast.error('Please fill in all fields');
    await Loader.btn(btnEl, async () => {
      try {
        await API.login(phone, password);
        Toast.success('Welcome back!');
        App.init();
      } catch (e) {
        Toast.error(e.message);
      }
    });
  },

  async sendOTP(btnEl) {
    const phone = document.getElementById('forgot-phone').value.trim();
    const email = document.getElementById('forgot-email').value.trim();
    if (!phone || !email) return Toast.error('Please fill in all fields');
    await Loader.btn(btnEl, async () => {
      try {
        await API.forgotPassword(phone, email);
        this.forgotPhone = phone;
        document.getElementById('forgot-step-1').classList.remove('active');
        document.getElementById('forgot-step-2').classList.add('active');
        Toast.success('OTP sent to your email');
      } catch (e) {
        Toast.error(e.message);
      }
    });
  },

  async doReset(btnEl) {
    const otp = document.getElementById('forgot-otp').value.trim();
    const newPw = document.getElementById('forgot-new-password').value;
    if (!otp || !newPw) return Toast.error('Please fill in all fields');
    await Loader.btn(btnEl, async () => {
      try {
        await API.resetPassword(this.forgotPhone, otp, newPw);
        Toast.success('Password reset! Please login.');
        this.showLogin();
      } catch (e) {
        Toast.error(e.message);
      }
    });
  },

  bindEnter() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (document.getElementById('login-password') === document.activeElement) {
          const btn = document.querySelector('.login-card .btn-gold');
          LoginPage.doLogin(btn);
        }
      }
    });
  }
};
