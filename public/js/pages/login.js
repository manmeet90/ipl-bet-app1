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
            <button class="btn btn-gold" onclick="LoginPage.doLogin()">Sign In</button>
            <div class="login-footer">
              <a onclick="LoginPage.showForgot()">Forgot Password?</a>
            </div>
          </div>

          <div id="forgot-form" style="display:none">
            <div class="forgot-step active" id="forgot-step-1">
              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" class="form-input" id="forgot-phone" placeholder="Your registered phone">
              </div>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" class="form-input" id="forgot-email" placeholder="Email to receive OTP">
              </div>
              <button class="btn btn-primary" onclick="LoginPage.sendOTP()">Send OTP</button>
              <div class="login-footer"><a onclick="LoginPage.showLogin()">Back to login</a></div>
            </div>

            <div class="forgot-step" id="forgot-step-2">
              <p style="color:var(--text-secondary);font-size:14px;margin-bottom:16px;">OTP sent! Check your email.</p>
              <div class="form-group">
                <label>Enter OTP</label>
                <input type="text" class="form-input" id="forgot-otp" placeholder="6-digit OTP" maxlength="6">
              </div>
              <div class="form-group">
                <label>New Password</label>
                <input type="password" class="form-input" id="forgot-new-password" placeholder="Min 6 characters">
              </div>
              <button class="btn btn-primary" onclick="LoginPage.doReset()">Reset Password</button>
              <div class="login-footer"><a onclick="LoginPage.showLogin()">Back to login</a></div>
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

  async doLogin() {
    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value;
    if (!phone || !password) return Toast.error('Please fill in all fields');
    try {
      await API.login(phone, password);
      Toast.success('Welcome back!');
      App.init();
    } catch (e) {
      Toast.error(e.message);
    }
  },

  async sendOTP() {
    const phone = document.getElementById('forgot-phone').value.trim();
    const email = document.getElementById('forgot-email').value.trim();
    if (!phone || !email) return Toast.error('Please fill in all fields');
    try {
      await API.forgotPassword(phone, email);
      this.forgotPhone = phone;
      document.getElementById('forgot-step-1').classList.remove('active');
      document.getElementById('forgot-step-2').classList.add('active');
      Toast.success('OTP sent to your email');
    } catch (e) {
      Toast.error(e.message);
    }
  },

  async doReset() {
    const otp = document.getElementById('forgot-otp').value.trim();
    const newPw = document.getElementById('forgot-new-password').value;
    if (!otp || !newPw) return Toast.error('Please fill in all fields');
    try {
      await API.resetPassword(this.forgotPhone, otp, newPw);
      Toast.success('Password reset! Please login.');
      this.showLogin();
    } catch (e) {
      Toast.error(e.message);
    }
  },

  bindEnter() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (document.getElementById('login-password') === document.activeElement) {
          LoginPage.doLogin();
        }
      }
    });
  }
};
