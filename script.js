console.log(firebase);
const API_BASE_URL = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : '';

window.apiFetch = async function (url, options = {}) {
    options.credentials = 'include';
    if (!options.headers) options.headers = {};
    if (options.method && options.method !== 'GET') {
        const csrfMatch = document.cookie.match(new RegExp('(^| )csrf_access_token=([^;]+)'));
        if (csrfMatch) options.headers['X-CSRF-TOKEN'] = csrfMatch[2];
    }
    const res = await fetch(url, options);
    if (res.status === 401 && !url.includes('/api/login') && !url.includes('/api/signup')) {
        const path = window.location.pathname;
        if (!path.endsWith('index.html') && path !== '/' && path !== '') {
            window.location.href = 'index.html';
        }
    }
    return res;
};

document.addEventListener('DOMContentLoaded', () => {

    // --- 0.0 Early Session Check & Redirect ---
    const isLoginPage = document.querySelector('.login-body');
    if (isLoginPage) {
        const splitScreen = document.querySelector('.split-screen');
        if (localStorage.getItem('user') && splitScreen) {
            splitScreen.style.opacity = '0';
            const loader = document.createElement('div');
            loader.id = 'auth-loader';
            loader.innerHTML = `<div class="auth-spinner"><i class="fa-solid fa-leaf fa-spin"></i><span>Restoring session...</span></div>`;
            document.body.appendChild(loader);
        }

        if (typeof firebase !== 'undefined') {
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    localStorage.setItem('user', user.email);
                    window.location.replace('main_advisor.html');
                } else {
                    const loader = document.getElementById('auth-loader');
                    if (loader) loader.remove();
                    if (splitScreen) splitScreen.style.opacity = '1';
                }
            });
        }
    }

    // --- 0. Toast Notification System ---
    window.showNotification = function (message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        if (type === 'error') iconClass = 'fa-circle-exclamation';
        toast.innerHTML = `<i class="fa-solid ${iconClass} toast-icon"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    };

    // --- 0.5 Notification Dropdown System ---
    const notifBell = document.getElementById('notificationBell');
    const notifDropdown = document.getElementById('notificationDropdown');
    const badge = document.getElementById('notificationBadge');

    if (notifBell && notifDropdown) {
        // Toggle dropdown
        notifBell.addEventListener('click', (e) => {
            if (e.target.classList.contains('clear-all')) return;
            notifDropdown.classList.toggle('open');
        });

        // Click outside closes it
        document.addEventListener('click', (e) => {
            if (!notifBell.contains(e.target)) {
                notifDropdown.classList.remove('open');
            }
        });

        // Global function to add notification
        window.addNotification = function (message, type = 'primary') {
            const list = document.getElementById('notificationList');
            if (!list) return;

            let iconHTML = '';
            if (type === 'success') iconHTML = '<i class="fa-solid fa-seedling"></i>';
            else if (type === 'warning') iconHTML = '<i class="fa-solid fa-virus"></i>';
            else if (type === 'info') iconHTML = '<i class="fa-solid fa-chart-line"></i>';
            else iconHTML = '<i class="fa-solid fa-indian-rupee-sign"></i>';

            const newItem = document.createElement('div');
            newItem.className = 'notif-item unread';
            newItem.innerHTML = `
                <div class="notif-icon ${type}">${iconHTML}</div>
                <div class="notif-content">
                    <p>${message}</p>
                    <span class="time">Just now</span>
                </div>
            `;

            const emptyState = list.querySelector('.empty-state-text');
            if (emptyState) emptyState.remove();

            list.insertBefore(newItem, list.firstChild);
            updateBadgeCount();
        };

        window.clearNotifications = function () {
            const list = document.getElementById('notificationList');
            if (list) {
                list.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem;" class="empty-state-text">
                        No new notifications
                    </div>
                `;
                updateBadgeCount();
            }
        };

        function updateBadgeCount() {
            const list = document.getElementById('notificationList');
            const unreadItems = list.querySelectorAll('.notif-item.unread');
            if (badge) {
                badge.innerText = unreadItems.length;
                if (unreadItems.length === 0) {
                    badge.style.display = 'none';
                } else {
                    badge.style.display = 'flex';
                }
            }
        }
        updateBadgeCount();
    }

    // --- 1. Login Page Logic ---
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Toggle Password Visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }

    // Handle Login Submit
    if (loginForm) {
        // If we are on login page, clear old session
        localStorage.removeItem('isLoggedIn');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = passwordInput.value;

            // Button loading state
            const btn = loginForm.querySelector('.login-btn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
            btn.style.opacity = '0.8';

            try {
                if (typeof firebase === 'undefined') {
                    throw new Error("Firebase SDK is not loaded.");
                }

                // Log in directly with Firebase Authentication
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Retrieve user name from Firestore to save locally
                let displayName = email.split('@')[0];
                try {
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        displayName = userDoc.data().name || displayName;
                    } else {
                        // Create user document if it doesn't exist
                        await firebase.firestore().collection('users').doc(user.uid).set({
                            uid: user.uid,
                            name: displayName,
                            email: email,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    }
                } catch (dbErr) {
                    console.error("Firestore retrieve user failed:", dbErr);
                }

                localStorage.setItem('user', user.email);
                localStorage.setItem('userName', displayName);
                localStorage.setItem('justLoggedIn', 'true');

                window.showNotification("Login Successful. Redirecting...", "success");

                setTimeout(() => {
                    window.location.href = 'main_advisor.html';
                }, 1200);
            } catch (error) {
                console.error('Login Error:', error);
                let errMsg = "Invalid credentials.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    errMsg = "Invalid email or password.";
                } else if (error.message) {
                    errMsg = error.message;
                }
                window.showNotification(errMsg, "error");
                btn.innerHTML = originalHtml;
                btn.style.opacity = '1';
            }
        });
    }

    // --- 1.1 Signup/Login Toggle ---
    const signupForm = document.getElementById('signupForm');
    const loginRedirect = document.getElementById('loginRedirect');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    const loginHeading = document.querySelector('.login-form-container .welcome-text'); // Need to target specific one if not inside form

    if (showSignup && signupForm && loginForm) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hide');
            loginRedirect.classList.add('hide');
            signupForm.classList.remove('hide');
        });

        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.classList.add('hide');
            loginForm.classList.remove('hide');
            loginRedirect.classList.remove('hide');
        });
    }

    // Handle Signup Submit
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullname = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            const btn = signupForm.querySelector('.signup-btn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...`;

            try {
                if (typeof firebase === 'undefined') {
                    throw new Error("Firebase SDK is not loaded.");
                }

                // Register user directly with Firebase Authentication
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Save user details directly to Firestore users collection
                await firebase.firestore().collection('users').doc(user.uid).set({
                    uid: user.uid,
                    name: fullname,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                window.showNotification("Account Created! Please Login.", "success");
                setTimeout(() => {
                    signupForm.classList.add('hide');
                    loginForm.classList.remove('hide');
                    loginRedirect.classList.remove('hide');
                }, 1500);
            } catch (error) {
                console.error("Firebase signup error:", error);
                let errMsg = "Signup failed.";
                if (error.code === 'auth/email-already-in-use') {
                    errMsg = "Email is already registered.";
                } else if (error.code === 'auth/weak-password') {
                    errMsg = "Password is too weak. Make sure it is at least 6 characters.";
                } else if (error.code === 'auth/invalid-email') {
                    errMsg = "Invalid email format.";
                } else if (error.message) {
                    errMsg = error.message;
                }
                window.showNotification(errMsg, "error");
                btn.innerHTML = originalHtml;
            }
        });
    }

    // --- 2. Dashboard Page Logic ---
    const isDashboard = document.querySelector('.dashboard-body');

    if (isDashboard) {
        // Firebase Auth Guard & Profile Loading
        if (typeof firebase !== 'undefined') {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (!user) {
                    window.location.replace('index.html');
                } else {
                    localStorage.setItem('user', user.email);
                    
                    const userNameEl = document.querySelector('.user-profile .user-name');
                    const avatarEl = document.querySelector('.user-profile .avatar');
                    let displayName = user.email.split('@')[0];

                    try {
                        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                        if (userDoc.exists && userDoc.data().name) {
                            displayName = userDoc.data().name;
                        }
                    } catch (err) {
                        console.error("Failed to load user name from Firestore:", err);
                    }

                    localStorage.setItem('userName', displayName);
                    if (userNameEl) userNameEl.textContent = displayName;
                    if (avatarEl) avatarEl.src = `https://ui-avatars.com/api/?name=${displayName}&background=10b981&color=fff`;
                }
            });
        }

        if (localStorage.getItem('justLoggedIn') === 'true') {
            setTimeout(() => window.showNotification("Login Successful", "success"), 300);
            localStorage.removeItem('justLoggedIn');
        }

        // --- Live Location Detector ---
        window.detectLocation = function () {
            const locationInput = document.getElementById('crop_location');

            if (!navigator.geolocation) {
                window.showNotification("Geolocation is not supported by your browser", "error");
                return;
            }

            locationInput.placeholder = "Detecting your location...";

            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    // Using OpenStreetMap's free reverse geocoding
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
                    const data = await response.json();

                    if (data && data.address) {
                        const city = data.address.city || data.address.town || data.address.village || data.address.county || "";
                        const state = data.address.state || "";
                        const country = data.address.country || "";

                        locationInput.value = `${city}${city && state ? ', ' : ''}${state}${state && country ? ', ' : ''}${country}`;
                        window.showNotification("Location detected successfully!", "success");

                        // --- Automatic Soil Analysis based on Location ---
                        try {
                            const soilRes = await apiFetch(`${API_BASE_URL}/api/get-soil-info`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ location: locationInput.value })
                            });
                            const soilData = await soilRes.json();
                            if (soilData.status === 'success') {
                                const soilDropdown = document.getElementById('crop_soil_type');
                                if (soilDropdown) {
                                    const options = Array.from(soilDropdown.options);
                                    const match = options.find(opt => opt.value === soilData.soil_type);
                                    if (match) {
                                        soilDropdown.value = soilData.soil_type;
                                        window.showNotification(`Detected ${soilData.soil_type} for your region`, "info");
                                    }
                                }
                            } else {
                                window.showNotification(soilData.message || "Invalid location. Please enter a real farming area.", "error");
                            }
                        } catch (soilErr) {
                            // If API returns 400, it's an error status
                            window.showNotification("Invalid location detected. Please check your input.", "error");
                        }
                    } else {
                        locationInput.value = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
                        window.showNotification("Coordinates found, but address service failed.", "info");
                    }
                } catch (e) {
                    locationInput.value = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
                    window.showNotification("Using raw coordinates due to network error.", "info");
                }
            }, (error) => {
                locationInput.placeholder = "e.g. Indore, MP";
                window.showNotification("Location access denied. Please type manually.", "error");
            });
        };

        // --- Navigation Logic ---
        const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
        const sections = document.querySelectorAll('.view-section');
        const imageCards = document.querySelectorAll('.image-card[data-navigate]');
        const pageTitle = document.getElementById('pageTitle');

        const mapTitle = {
            'dashboard-home': 'Dashboard Overview',
            'crop-recommendation': 'Crop Recommendation AI',
            'yield-prediction': 'Yield Prediction Tool',
            'disease-detection': 'Disease Diagnosis',
            'market-prices': 'Live Market Prices',
            'profile-settings': 'Profile Settings'
        };

        function activateSection(targetId) {
            // Remove active from links
            navLinks.forEach(link => link.classList.remove('active'));

            // Find target link and set active
            const activeLink = Array.from(navLinks).find(l => l.getAttribute('data-target') === targetId);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Hide all sections
            sections.forEach(sec => sec.classList.remove('active'));

            // Show target section
            const targetSec = document.getElementById(targetId);
            if (targetSec) {
                targetSec.classList.add('active');
                pageTitle.textContent = mapTitle[targetId] || 'Dashboard Overview';
            }
        }

        // Global navigate function to handle pushState and actions
        window.navigateToSection = function (targetId) {
            const currentHash = window.location.hash.substring(1);
            if (targetId === currentHash) return;

            history.pushState({ section: targetId }, '', '#' + targetId);
            activateSection(targetId);

            if (targetId === 'market-prices') {
                window.loadMarketPrices();
                window.updateChart();
            } else if (targetId === 'profile-settings') {
                window.loadProfileData();
            }
        };

        // Sidebar clicks
        navLinks.forEach(link => {
            if (link.id === 'logoutBtn') return; // skip logout
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('data-target');
                window.navigateToSection(target);
            });
        });

        // Image Card clicks
        imageCards.forEach(card => {
            card.addEventListener('click', () => {
                const target = card.getAttribute('data-navigate');
                window.navigateToSection(target);
            });
        });

        // Make user profile in topbar clickable to navigate to profile settings
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            userProfile.addEventListener('click', () => {
                window.navigateToSection('profile-settings');
            });
        }

        // Listen to back/forward button history navigation
        window.addEventListener('popstate', (e) => {
            let targetId = 'dashboard-home';
            if (e.state && e.state.section) {
                targetId = e.state.section;
            } else {
                const hash = window.location.hash.substring(1);
                if (hash && mapTitle[hash]) {
                    targetId = hash;
                }
            }
            activateSection(targetId);

            if (targetId === 'market-prices') {
                window.loadMarketPrices();
                window.updateChart();
            } else if (targetId === 'profile-settings') {
                window.loadProfileData();
            }
        });

        // Resolve initial section from URL Hash on page load
        let initialSection = 'dashboard-home';
        const initialHash = window.location.hash.substring(1);
        if (initialHash && mapTitle[initialHash]) {
            initialSection = initialHash;
        }
        history.replaceState({ section: initialSection }, '', '#' + initialSection);
        activateSection(initialSection);

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    if (typeof firebase !== 'undefined') {
                        await firebase.auth().signOut();
                    }
                } catch (err) {
                    console.error("Firebase sign out failed:", err);
                }
                localStorage.clear();
                window.location.replace('index.html');
            });
        }

        // --- Profile Settings & Security Tab System ---
        const profileTabBtns = document.querySelectorAll('.profile-tab-btn');
        const tabContents = document.querySelectorAll('.profile-form-panel .tab-content');

        profileTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                profileTabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const tabId = 'tab-' + btn.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Toggle Edit State
        const editProfileBtn = document.getElementById('editProfileBtn');
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');

        let originalProfileName = '';
        let originalProfileEmail = '';

        function setProfileEditState(isEditing) {
            if (profileName) profileName.disabled = !isEditing;
            if (profileEmail) profileEmail.disabled = !isEditing;

            if (isEditing) {
                if (editProfileBtn) editProfileBtn.classList.add('hide');
                if (saveProfileBtn) saveProfileBtn.classList.remove('hide');
                if (cancelEditBtn) cancelEditBtn.classList.remove('hide');
            } else {
                if (editProfileBtn) editProfileBtn.classList.remove('hide');
                if (saveProfileBtn) saveProfileBtn.classList.add('hide');
                if (cancelEditBtn) cancelEditBtn.classList.add('hide');
            }
        }

        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                originalProfileName = profileName ? profileName.value : '';
                originalProfileEmail = profileEmail ? profileEmail.value : '';
                setProfileEditState(true);
            });
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => {
                if (profileName) profileName.value = originalProfileName;
                if (profileEmail) profileEmail.value = originalProfileEmail;
                setProfileEditState(false);
            });
        }

        // Re-authentication handling
        const reauthModal = document.getElementById('reauthModal');
        const closeReauthModal = document.getElementById('closeReauthModal');
        const reauthForm = document.getElementById('reauthForm');
        let pendingReauthCallback = null;

        function showReauthModal(callback) {
            pendingReauthCallback = callback;
            if (reauthModal) {
                const reauthPasswordInput = document.getElementById('reauthPassword');
                if (reauthPasswordInput) reauthPasswordInput.value = '';
                reauthModal.classList.remove('hide');
            }
        }

        if (closeReauthModal) {
            closeReauthModal.addEventListener('click', () => {
                if (reauthModal) reauthModal.classList.add('hide');
                pendingReauthCallback = null;
            });
        }

        if (reauthForm) {
            reauthForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const reauthPasswordInput = document.getElementById('reauthPassword');
                const password = reauthPasswordInput ? reauthPasswordInput.value : '';
                const submitBtn = document.getElementById('reauthSubmitBtn');
                const originalHtml = submitBtn ? submitBtn.innerHTML : 'Verify & Continue';

                if (submitBtn) {
                    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`;
                    submitBtn.disabled = true;
                }

                try {
                    const user = firebase.auth().currentUser;
                    if (!user) throw new Error("No user currently logged in.");

                    const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
                    await user.reauthenticateWithCredential(credential);

                    if (reauthModal) reauthModal.classList.add('hide');
                    window.showNotification("Verification successful.", "success");

                    if (pendingReauthCallback) {
                        const callback = pendingReauthCallback;
                        pendingReauthCallback = null;
                        await callback();
                    }
                } catch (err) {
                    console.error("Re-authentication failed:", err);
                    let msg = "Verification failed. Please check your password.";
                    if (err.code === 'auth/wrong-password') {
                        msg = "Incorrect password. Please try again.";
                    } else if (err.message) {
                        msg = err.message;
                    }
                    window.showNotification(msg, "error");
                } finally {
                    if (submitBtn) {
                        submitBtn.innerHTML = originalHtml;
                        submitBtn.disabled = false;
                    }
                }
            });
        }

        // Load profile data
        window.loadProfileData = async function () {
            if (typeof firebase === 'undefined') return;
            const user = firebase.auth().currentUser;
            if (!user) return;

            const summaryNameEl = document.getElementById('profileSummaryName');
            const summaryEmailEl = document.getElementById('profileSummaryEmail');
            const largeAvatarEl = document.getElementById('profileLargeAvatar');

            // Set Auth values first
            if (profileEmail) profileEmail.value = user.email;
            if (summaryEmailEl) summaryEmailEl.textContent = user.email;

            let displayName = user.email.split('@')[0];

            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().name) {
                    displayName = userDoc.data().name;
                }
            } catch (err) {
                console.error("Firestore get profile details error:", err);
            }

            if (profileName) profileName.value = displayName;
            if (summaryNameEl) summaryNameEl.textContent = displayName;

            const initials = displayName;
            if (largeAvatarEl) {
                largeAvatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=10b981&color=fff&size=120`;
            }
        };

        // Submit Profile Details Changes
        const profileDetailsForm = document.getElementById('profileDetailsForm');
        if (profileDetailsForm) {
            profileDetailsForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const newName = profileName ? profileName.value.trim() : '';
                const newEmail = profileEmail ? profileEmail.value.trim() : '';

                // Validations
                if (!newName) {
                    window.showNotification("Name cannot be empty.", "error");
                    return;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(newEmail)) {
                    window.showNotification("Please enter a valid email address.", "error");
                    return;
                }

                const saveBtn = document.getElementById('saveProfileBtn');
                const originalHtml = saveBtn ? saveBtn.innerHTML : 'Save Changes';
                if (saveBtn) {
                    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;
                    saveBtn.disabled = true;
                }

                const executeProfileUpdate = async () => {
                    const user = firebase.auth().currentUser;
                    if (!user) return;

                    const emailChanged = user.email.toLowerCase() !== newEmail.toLowerCase();

                    try {
                        if (emailChanged) {
                            await user.updateEmail(newEmail);
                        }

                        // Update Firestore collection
                        await firebase.firestore().collection('users').doc(user.uid).set({
                            name: newName,
                            email: newEmail,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });

                        localStorage.setItem('user', newEmail);
                        localStorage.setItem('userName', newName);

                        // Refresh local profile elements
                        await window.loadProfileData();

                        // Sync topbar user profile layout
                        const topbarName = document.querySelector('.user-profile .user-name');
                        const topbarAvatar = document.querySelector('.user-profile .avatar');
                        if (topbarName) topbarName.textContent = newName;
                        if (topbarAvatar) topbarAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=10b981&color=fff`;

                        setProfileEditState(false);
                        window.showNotification("Profile updated successfully.", "success");
                    } catch (err) {
                        console.error("Profile update failed:", err);
                        if (err.code === 'auth/requires-recent-login') {
                            showReauthModal(executeProfileUpdate);
                        } else {
                            let msg = "Failed to update profile.";
                            if (err.code === 'auth/email-already-in-use') {
                                msg = "This email is already in use by another account.";
                            } else if (err.message) {
                                msg = err.message;
                            }
                            window.showNotification(msg, "error");
                        }
                    }
                };

                await executeProfileUpdate();
                if (saveBtn) {
                    saveBtn.innerHTML = originalHtml;
                    saveBtn.disabled = false;
                }
            });
        }

        // Change Password Changes
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const newPasswordInput = document.getElementById('profileNewPassword');
                const confirmPasswordInput = document.getElementById('profileConfirmPassword');
                const newPassword = newPasswordInput ? newPasswordInput.value : '';
                const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

                // Validation
                if (newPassword.length < 6) {
                    window.showNotification("Password must be at least 6 characters long.", "error");
                    return;
                }
                if (newPassword !== confirmPassword) {
                    window.showNotification("Passwords do not match.", "error");
                    return;
                }

                const passwordBtn = document.getElementById('savePasswordBtn');
                const originalHtml = passwordBtn ? passwordBtn.innerHTML : 'Update Password';
                if (passwordBtn) {
                    passwordBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Updating...`;
                    passwordBtn.disabled = true;
                }

                const executePasswordUpdate = async () => {
                    const user = firebase.auth().currentUser;
                    if (!user) return;

                    try {
                        await user.updatePassword(newPassword);
                        if (newPasswordInput) newPasswordInput.value = '';
                        if (confirmPasswordInput) confirmPasswordInput.value = '';
                        window.showNotification("Password updated successfully.", "success");
                    } catch (err) {
                        console.error("Password update failed:", err);
                        if (err.code === 'auth/requires-recent-login') {
                            showReauthModal(executePasswordUpdate);
                        } else {
                            let msg = "Failed to update password.";
                            if (err.message) msg = err.message;
                            window.showNotification(msg, "error");
                        }
                    }
                };

                await executePasswordUpdate();
                if (passwordBtn) {
                    passwordBtn.innerHTML = originalHtml;
                    passwordBtn.disabled = false;
                }
            });
        }

        // Password visibility toggles for new inputs
        const toggleNewPassword = document.getElementById('toggleNewPassword');
        const newPasswordInputVal = document.getElementById('profileNewPassword');
        if (toggleNewPassword && newPasswordInputVal) {
            toggleNewPassword.addEventListener('click', () => {
                const type = newPasswordInputVal.getAttribute('type') === 'password' ? 'text' : 'password';
                newPasswordInputVal.setAttribute('type', type);
                toggleNewPassword.classList.toggle('fa-eye');
                toggleNewPassword.classList.toggle('fa-eye-slash');
            });
        }

        const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
        const confirmPasswordInputVal = document.getElementById('profileConfirmPassword');
        if (toggleConfirmPassword && confirmPasswordInputVal) {
            toggleConfirmPassword.addEventListener('click', () => {
                const type = confirmPasswordInputVal.getAttribute('type') === 'password' ? 'text' : 'password';
                confirmPasswordInputVal.setAttribute('type', type);
                toggleConfirmPassword.classList.toggle('fa-eye');
                toggleConfirmPassword.classList.toggle('fa-eye-slash');
            });
        }

        const toggleReauthPassword = document.getElementById('toggleReauthPassword');
        const reauthPasswordInputVal = document.getElementById('reauthPassword');
        if (toggleReauthPassword && reauthPasswordInputVal) {
            toggleReauthPassword.addEventListener('click', () => {
                const type = reauthPasswordInputVal.getAttribute('type') === 'password' ? 'text' : 'password';
                reauthPasswordInputVal.setAttribute('type', type);
                toggleReauthPassword.classList.toggle('fa-eye');
                toggleReauthPassword.classList.toggle('fa-eye-slash');
            });
        }

        // --- Disease Image Upload Logic ---
        const uploadArea = document.getElementById('uploadArea');
        const diseaseImageInput = document.getElementById('diseaseImage');
        const previewContainer = document.getElementById('previewContainer');
        const imagePreview = document.getElementById('imagePreview');

        if (uploadArea && diseaseImageInput) {

            // Drag over effects
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--primary)';
                uploadArea.style.background = 'var(--primary-light)';
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--border)';
                uploadArea.style.background = '#FAFAFA';
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--border)';
                uploadArea.style.background = '#FAFAFA';

                if (e.dataTransfer.files.length > 0) {
                    handleFileSelect(e.dataTransfer.files[0]);
                }
            });

            diseaseImageInput.addEventListener('change', function () {
                if (this.files && this.files[0]) {
                    handleFileSelect(this.files[0]);
                }
            });

            function handleFileSelect(file) {
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (e) {
                    imagePreview.src = e.target.result;
                    uploadArea.classList.add('hide');
                    previewContainer.classList.remove('hide');

                    window.showNotification("Image uploaded successfully", "success");

                    // Reset result panel
                    document.getElementById('diseaseResult').innerHTML = `
                        <i class="fa-solid fa-microscope"></i>
                        <p>Image loaded. Ready for scan.</p>
                    `;
                    document.getElementById('diseaseResult').className = 'empty-state';
                };
                reader.readAsDataURL(file);
            }

            window.clearPreview = function () {
                diseaseImageInput.value = '';
                imagePreview.src = '';
                uploadArea.classList.remove('hide');
                previewContainer.classList.add('hide');
                document.getElementById('diseaseResult').innerHTML = `
                    <i class="fa-solid fa-microscope"></i>
                    <p>Upload an image for diagnosis...</p>
                `;
                document.getElementById('diseaseResult').className = 'empty-state';
            }
        }
    }
});

// --- Market Table Filter ---
let marketSearchTimeout = null;

function saveMarketSearchToFirestore(district, crop) {
    if (marketSearchTimeout) {
        clearTimeout(marketSearchTimeout);
    }
    marketSearchTimeout = setTimeout(async () => {
        try {
            if (typeof firebase !== 'undefined') {
                const currentUser = firebase.auth().currentUser;
                if (currentUser) {
                    const searchInputVal = document.getElementById("marketSearchInput")?.value || "";
                    if (district === "All" && crop === "All" && !searchInputVal.trim()) {
                        return;
                    }
                    await firebase.firestore().collection('market_searches').add({
                        userEmail: currentUser.email,
                        district: district,
                        crop: crop,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        } catch (err) {
            console.error("Firestore error saving market search:", err);
        }
    }, 1500);
}

window.filterMarketTable = function () {
    const searchFilter = document.getElementById("marketSearchInput")?.value.toLowerCase() || "";
    const districtFilter = document.getElementById("marketDistrictFilter")?.value || "All";
    const cropFilter = document.getElementById("marketCropFilter")?.value || "All";

    const table = document.getElementById("marketTableBody");
    if (!table) return;
    const tr = table.getElementsByTagName("tr");

    for (let i = 0; i < tr.length; i++) {
        // Skip error or loading rows
        if (tr[i].classList.contains('loading-row') || tr[i].cells.length < 2) continue;

        const rowCrop = tr[i].getAttribute('data-crop');
        const rowDistrict = tr[i].getAttribute('data-district');
        const tdName = tr[i].getElementsByTagName("td")[0];
        const tdMandi = tr[i].getElementsByTagName("td")[1];

        const txtValueName = tdName ? (tdName.textContent || tdName.innerText).toLowerCase() : "";
        const txtValueMandi = tdMandi ? (tdMandi.textContent || tdMandi.innerText).toLowerCase() : "";

        const matchesSearch = txtValueName.includes(searchFilter) || txtValueMandi.includes(searchFilter);
        const matchesDistrict = districtFilter === "All" || rowDistrict === districtFilter || txtValueMandi.includes(districtFilter.toLowerCase());
        const matchesCrop = cropFilter === "All" || rowCrop === cropFilter;

        if (matchesSearch && matchesDistrict && matchesCrop) {
            tr[i].style.display = "";
        } else {
            tr[i].style.display = "none";
        }
    }

    // Auto-update chart if crop filter changes
    const chartCrop = document.getElementById('chartCropSelector');
    if (chartCrop && cropFilter !== "All" && chartCrop.value !== cropFilter) {
        chartCrop.value = cropFilter;
        window.updateChart();
    }

    // Save search parameters to Firestore
    saveMarketSearchToFirestore(districtFilter, cropFilter);
};

// --- Market Price Fetcher & Live Updates ---
let previousPrices = {};
let isFetchingMarketPrices = false;
let isOn429Cooldown = false;
let hasShown429Warning = false;

window.loadMarketPrices = async function (isTickerOnly = false) {
    // 1. Prevent concurrent fetches
    if (isFetchingMarketPrices) {
        return;
    }

    // 2. Prevent API calls when page is hidden/inactive
    if (document.hidden || document.visibilityState === 'hidden') {
        return;
    }

    // 3. Prevent calls during 429 cooldown
    if (isOn429Cooldown) {
        return;
    }

    const tableBody = document.getElementById('marketTableBody');
    const tickerEl = document.getElementById('liveTicker');

    isFetchingMarketPrices = true;
    try {
        const response = await apiFetch(`${API_BASE_URL}/api/market-prices`);
        
        // 4. Handle 429 Rate Limit
        if (response.status === 429) {
            isOn429Cooldown = true;
            setTimeout(() => {
                isOn429Cooldown = false;
            }, 30000);

            if (!hasShown429Warning) {
                window.showNotification("Too many requests. Pausing updates for 30 seconds.", "warning");
                hasShown429Warning = true;
            }

            if (tickerEl && (tickerEl.innerText.includes("Fetching live market data") || tickerEl.innerText.trim() === "")) {
                tickerEl.innerHTML = `<span class="ticker-item" style="color:var(--warning);">Rate limit exceeded. Waiting 30s...</span>`;
            }

            if (!isTickerOnly && tableBody && tableBody.querySelector('.loading-row')) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--warning); padding: 20px;">Rate limit exceeded. Retrying in 30 seconds...</td></tr>`;
            }
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            // Reset warning flag on success
            hasShown429Warning = false;

            // Update Ticker - Only show first 20 items to avoid freezing DOM
            if (tickerEl) {
                tickerEl.innerHTML = window.DOMPurify.sanitize(data.prices.slice(0, 20).map(item => `
                    <span class="ticker-item">
                        ${item.name} (${item.mandi}): 
                        <span class="ticker-price">₹${item.price.toLocaleString('en-IN')}</span> 
                        <span class="ticker-trend ${item.status === 'up' ? 'trend-up' : 'trend-down'}">
                            ${item.status === 'up' ? '▲' : '▼'} ${item.trend}
                        </span>
                    </span>
                `).join(''));
            }

            // Update Table
            if (!isTickerOnly && tableBody) {
                if (tableBody.querySelector('.loading-row')) tableBody.innerHTML = '';

                // Populate Dropdowns if empty
                const districtFilter = document.getElementById('marketDistrictFilter');
                const cropFilter = document.getElementById('marketCropFilter');

                if (districtFilter && districtFilter.options.length <= 1) {
                    const uniqueDistricts = [...new Set(data.prices.map(item => item.district))].sort();
                    uniqueDistricts.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d;
                        opt.textContent = d;
                        districtFilter.appendChild(opt);
                    });
                }
                if (cropFilter && cropFilter.options.length <= 1) {
                    const uniqueCrops = [...new Set(data.prices.map(item => item.name))].sort();
                    uniqueCrops.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c;
                        opt.textContent = c;
                        cropFilter.appendChild(opt);
                    });
                }

                data.prices.forEach(item => {
                    const key = `${item.name}-${item.mandi}`.replace(/\s+/g, '-');
                    const trendIcon = item.status === 'up' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
                    const trendClass = item.status === 'up' ? 'trend-up' : 'trend-down';

                    let flashClass = '';
                    if (previousPrices[key] && previousPrices[key] !== item.price) {
                        flashClass = item.price > previousPrices[key] ? 'flash-up' : 'flash-down';
                    }
                    previousPrices[key] = item.price;

                    let row = document.getElementById(`row-${key}`);
                    if (!row) {
                        row = document.createElement('tr');
                        row.id = `row-${key}`;
                        row.setAttribute('data-district', item.district || item.mandi);
                        row.setAttribute('data-crop', item.name);
                        tableBody.appendChild(row);
                    }

                    row.className = flashClass;
                    row.innerHTML = `
                        <td><strong>${window.DOMPurify.sanitize(item.name)}</strong></td>
                        <td>${window.DOMPurify.sanitize(item.district || item.mandi)}</td>
                        <td>${window.DOMPurify.sanitize(item.mandi)}</td>
                        <td style="color: var(--text-muted)">₹ ${item.min.toLocaleString('en-IN')}</td>
                        <td style="color: var(--text-muted)">₹ ${item.max.toLocaleString('en-IN')}</td>
                        <td style="font-weight: 600; color: var(--secondary)">₹ ${item.price.toLocaleString('en-IN')}</td>
                        <td class="${trendClass}"><i class="fa-solid ${trendIcon}"></i> ${item.trend}</td>
                    `;
                });

                // Re-apply filter after data load
                window.filterMarketTable();
            }
        }
    } catch (e) {
        console.error("Live update failed", e);
        if (!isTickerOnly && tableBody && tableBody.querySelector('.loading-row')) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: red; padding: 20px;">Failed to load market data. Please try again later.</td></tr>`;
        }
        if (tickerEl && tickerEl.innerText.includes("Fetching live market data")) {
            tickerEl.innerHTML = `<span class="ticker-item" style="color:red;">Market data currently unavailable.</span>`;
        }
    } finally {
        isFetchingMarketPrices = false;
    }
};

// Start Auto-Updates - Merged into a single 30s interval with visibility check (only runs on dashboard)
setInterval(() => {
    if (document.querySelector('.dashboard-body')) {
        const isTableActive = !!document.querySelector('#market-prices.active');
        window.loadMarketPrices(!isTableActive);
    }
}, 30000);

// Initial Load (only runs on dashboard)
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.dashboard-body')) {
        window.loadMarketPrices(true);
    }
});

// --- Chart.js Configuration ---
let priceChart = null;

window.updateChart = async function () {
    const crop = document.getElementById('chartCropSelector').value;
    const ctx = document.getElementById('priceHistoryChart').getContext('2d');

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/historical-trends?crop=${crop}`);
        const data = await response.json();

        if (data.status === 'success') {
            if (priceChart) priceChart.destroy();

            priceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: `${crop} Price (₹/Quintal)`,
                        data: data.data,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointBackgroundColor: '#10b981'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            grid: { color: '#f3f4f6' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    } catch (e) {
        console.error("Chart load failed", e);
    }
};

// --- Feature Action Functions (Global Scope for inline onclick) ---

window.smartAnalyze = async function () {
    const loc = document.getElementById('crop_location')?.value;
    const loading = document.getElementById('cropLoading');
    const loadText = document.getElementById('loadingText');
    const resultBox = document.getElementById('cropResult');

    if (!loc || loc.length < 3) {
        window.showNotification("Please enter a valid district or enable location access", "error");
        return;
    }

    loading.style.display = 'block';
    loadText.innerText = "Fetching data for your location...";
    resultBox.innerHTML = window.DOMPurify.sanitize(`<div class="empty-state"><i class="fa-solid fa-satellite fa-spin"></i><p>Synchronizing with regional databases...</p></div>`);

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/smart-recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: loc })
        });
        const data = await response.json();

        if (data.status === 'success') {
            displayRecommendation(data);
            window.showNotification(`Data-driven analysis complete for ${loc}`, "success");
        } else {
            window.showNotification(data.message, "error");
            resultBox.innerHTML = window.DOMPurify.sanitize(`<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>${data.message}</p></div>`);
        }
    } catch (e) {
        window.showNotification("Server error. Check your connection.", "error");
    } finally {
        loading.style.display = 'none';
    }
};

window.analyzeCrop = async function () {
    const locInput = document.getElementById('crop_location');
    const soilDropdown = document.getElementById('crop_soil_type');
    const loading = document.getElementById('cropLoading');
    const loadText = document.getElementById('loadingText');
    const resultBox = document.getElementById('cropResult');

    // If location is provided, try to auto-update soil first for better accuracy
    if (locInput?.value && locInput.value.length >= 3) {
        try {
            const soilRes = await apiFetch(`${API_BASE_URL}/api/get-soil-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: locInput.value })
            });
            const soilData = await soilRes.json();
            if (soilData.status === 'success' && soilDropdown) {
                soilDropdown.value = soilData.soil_type;
                window.showNotification(`Auto-synced soil for ${locInput.value}`, "info");
            }
        } catch (e) { /* Fallback to manual dropdown selection */ }
    }

    loading.style.display = 'block';
    loadText.innerText = "Analyzing manual parameters...";
    resultBox.innerHTML = window.DOMPurify.sanitize(`<div class="empty-state"><i class="fa-solid fa-microchip fa-spin"></i><p>Processing farm conditions...</p></div>`);

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                soil_type: soilDropdown?.value,
                season: document.getElementById('crop_season')?.value,
                water: document.getElementById('crop_water')?.value,
                health: document.getElementById('crop_health')?.value,
                weather: document.getElementById('crop_weather')?.value,
                location: locInput?.value
            })
        });
        const data = await response.json();
        if (data.status === 'success') displayRecommendation(data);
    } catch (e) {
        resultBox.innerHTML = window.DOMPurify.sanitize(`<div class="error-msg"><i class="fa-solid fa-circle-exclamation"></i> Analysis failed.</div>`);
    } finally {
        loading.style.display = 'none';
    }
};

// Add Enter key support for Location field
document.getElementById('crop_location')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        window.smartAnalyze();
    }
});

function displayRecommendation(data) {
    const p = data.primary_crop;
    const alts = data.alternatives;
    const params = data.detected_params || {};
    const resultBox = document.getElementById('cropResult');

    resultBox.className = '';
    let html = `
        <div class="result-card primary-recommendation">
            <div class="accuracy-badge">${p.accuracy}% Match</div>
            <div class="voice-btn" onclick="window.speakResults('${p.name.split(' (')[0]}')">
                <i class="fa-solid fa-volume-high"></i> Listen
            </div>
            
            <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Top Choice 🌱</span>
            <h2 style="color: var(--secondary); margin: 10px 0 5px 0; font-size: 1.8rem;">${p.name}</h2>
            
            ${params.soil ? `<p style="font-size:0.85rem; color:var(--primary); font-weight:600; margin-bottom:10px;">Mapped: ${params.soil} | ${params.season} Season</p>` : ''}
            
            <p style="margin-bottom: 20px; font-style: italic; color: var(--text-muted); font-size: 1rem;">"${p.reasoning}"</p>
            
            <div class="result-info-grid">
                <div class="info-stat">
                    <i class="fa-solid fa-chart-line"></i>
                    <div>
                        <span class="label">Exp. Yield</span>
                        <span class="val">${p.expected_yield}</span>
                    </div>
                </div>
                <div class="info-stat">
                    <i class="fa-solid fa-indian-rupee-sign"></i>
                    <div>
                        <span class="label">Mandi Price</span>
                        <span class="val">₹ ${p.mandi_price}/q</span>
                    </div>
                </div>
            </div>

            <div class="expert-box">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                    <i class="fa-solid fa-user-doctor" style="color:var(--primary)"></i>
                    <strong style="color:var(--secondary)">Expert Advice:</strong>
                </div>
                <p>${p.expert_tip}</p>
            </div>

            <div class="alternatives-section">
                <h4 style="text-align:left; color:var(--secondary); margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-list-check"></i> Alternatives
                </h4>
                <div class="alt-grid">
    `;

    alts.forEach(alt => {
        html += `
            <div class="alt-card">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                    <span class="alt-accuracy">${alt.accuracy}%</span>
                </div>
                <h5 style="color:var(--secondary); font-size:1rem;">${alt.name.split(' (')[0]}</h5>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:5px;">Yield: ${alt.expected_yield.split(' ')[0]} T/A</p>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;
    resultBox.innerHTML = window.DOMPurify.sanitize(html);
    window.showNotification("Best Crop Identified!", "success");

    // Save recommendation to Firestore (only if logged in)
    try {
        if (typeof firebase !== 'undefined') {
            const currentUser = firebase.auth().currentUser;
            if (currentUser) {
                firebase.firestore().collection('crop_recommendations').add({
                    userEmail: currentUser.email,
                    location: document.getElementById('crop_location')?.value || "",
                    soilType: params.soil || document.getElementById('crop_soil_type')?.value || "Unknown",
                    recommendedCrop: p.name,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }).catch(err => console.error("Firestore error saving recommendation:", err));
            }
        }
    } catch (fbErr) {
        console.error("Failed to save crop recommendation to Firestore:", fbErr);
    }
}

window.speakResults = function (text) {
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance();
        msg.text = `The best crop for your land is ${text}. Check the expert advice for more details.`;
        msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
        window.showNotification("Reading results...", "info");
    } else {
        window.showNotification("Voice support not available in this browser", "error");
    }
};

window.predictYield = async function () {
    const resultBox = document.getElementById('yieldResult');
    const area = document.getElementById('yield_area').value;

    if (!area) return window.showNotification("Enter area", "error");

    resultBox.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><p>Calculating yield...</p>`;

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area })
        });
        const data = await response.json();

        if (data.status === 'success') {
            resultBox.className = '';
            resultBox.innerHTML = window.DOMPurify.sanitize(`
                <div class="result-card" style="background:#FFFBF1; border-color:#F59E0B">
                    <i class="fa-solid fa-boxes-stacked" style="font-size: 2rem; color: #F59E0B; margin-bottom: 10px;"></i>
                    <h4 style="color: #D97706">Expected Yield: ${data.expected_yield}</h4>
                    <p>Estimated Profit: ${data.profit_est}</p>
                </div>
            `);
            window.showNotification("Yield Calculated", "info");

            // Save to Firestore (only if logged in)
            try {
                if (typeof firebase !== 'undefined') {
                    const currentUser = firebase.auth().currentUser;
                    if (currentUser) {
                        firebase.firestore().collection('yield_predictions').add({
                            userEmail: currentUser.email,
                            crop: document.getElementById('yield_crop')?.value || "Unknown",
                            landArea: parseFloat(area) || 0,
                            predictedYield: data.expected_yield,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(err => console.error("Firestore error saving yield prediction:", err));
                    }
                }
            } catch (fbErr) {
                console.error("Failed to save yield prediction to Firestore:", fbErr);
            }
        }
    } catch (e) {
        resultBox.innerHTML = `<p style="color:red">Server Error</p>`;
    }
};

window.scanDisease = async function () {
    const btn = document.querySelector('button[onclick="scanDisease()"]');
    const fileInput = document.getElementById('diseaseImage');
    if (!fileInput.files[0]) return window.showNotification("Upload image", "error");

    btn.innerText = `Scanning...`;
    const resultBox = document.getElementById('diseaseResult');

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    try {
        const response = await apiFetch(`${API_BASE_URL}/api/detect`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.status === 'success') {
            const d = data.detection;
            btn.innerText = `Scan Now`;

            // Format remedies as list items
            const remediesList = d.remedy.map(r => `<li>${r}</li>`).join('');

            resultBox.className = '';
            resultBox.innerHTML = window.DOMPurify.sanitize(`
                <div class="result-card" style="background:#FEF2F2; border-color:#EF4444">
                    <i class="fa-solid fa-virus" style="font-size: 2rem; color: #EF4444; margin-bottom: 10px;"></i>
                    <h4 style="color: #B91C1C">Detected: ${d.name}</h4>
                    <p><strong>Description:</strong> ${d.description}</p>
                    
                    <div style="text-align:left; background:white; padding:15px; border-radius:8px; margin-top:15px; border:1px solid #FECACA;">
                        <strong style="color:var(--secondary); font-size:0.9rem;">Recommended Solutions:</strong>
                        <ul style="margin-left:20px; font-size:0.85rem; color:var(--text-main); margin-top:5px;">
                            ${remediesList}
                        </ul>
                    </div>
                </div>
            `);

            // Save to Firestore (only if logged in)
            try {
                if (typeof firebase !== 'undefined') {
                    const currentUser = firebase.auth().currentUser;
                    if (currentUser) {
                        const confidence = (85 + Math.random() * 14).toFixed(1) + "%";
                        firebase.firestore().collection('disease_detections').add({
                            userEmail: currentUser.email,
                            diseaseName: d.name,
                            confidence: confidence,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        }).catch(err => console.error("Firestore error saving disease detection:", err));
                    }
                }
            } catch (fbErr) {
                console.error("Failed to save disease detection to Firestore:", fbErr);
            }
        }
    } catch (e) {
        btn.innerText = `Scan Now`;
    }
};

