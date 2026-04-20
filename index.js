const greetingTitle = document.getElementById("greeting-title");
const serviceLine = document.getElementById("service-line");
const loginForm = document.querySelector(".login-form");
const loginCard = document.querySelector(".login-card");
const createAccountCard = document.getElementById("create-account-card");
const createAccountForm = document.getElementById("create-account-form");
const goToCreateAccountButton = document.getElementById("go-to-create-account");
const backToLoginButton = document.getElementById("back-to-login");
const appView = document.getElementById("app-view");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const currentTimeEl = document.getElementById("current-time");
const userGreetingEl = document.getElementById("user-greeting");
const userNameEl = document.getElementById("user-name");

// TEMP DEV CREDENTIALS: remove before shipping production authentication.
const TEMP_TEST_USER = {
	username: "test",
	email: "test@test.com",
	firstName: "John",
	lastName: "Appleseed",
	password: "test",
};

const accounts = [TEMP_TEST_USER];
let loggedInTimerId;

function normalizeIdentifier(value) {
	return value.trim().toLowerCase();
}

function findAccountByLoginIdentifier(identifier) {
	const normalizedIdentifier = normalizeIdentifier(identifier);

	return accounts.find((account) => {
		const accountUsername = normalizeIdentifier(account.username);
		const accountEmail = normalizeIdentifier(account.email);

		return normalizedIdentifier === accountUsername || normalizedIdentifier === accountEmail;
	});
}

function showLoginState() {
	if (loginCard) {
		loginCard.hidden = false;
	}

	if (createAccountCard) {
		createAccountCard.hidden = true;
	}

	if (appView) {
		appView.hidden = true;
	}
}

function showCreateAccountState() {
	if (loginCard) {
		loginCard.hidden = true;
	}

	if (createAccountCard) {
		createAccountCard.hidden = false;
	}

	if (appView) {
		appView.hidden = true;
	}
}

function getGreetingDetails(hour) {
	if (hour < 12) {
		return {
			greeting: "Good Morning,",
			serving: "Now Serving Breakfast",
		};
	}

	if (hour < 17) {
		return {
			greeting: "Good Afternoon,",
			serving: "Now Serving Lunch",
		};
	}

	return {
		greeting: "Good Evening,",
		serving: "Now Serving Dinner",
	};
}

function updateGreeting() {
	const currentHour = new Date().getHours();
	const details = getGreetingDetails(currentHour);

	if (greetingTitle) {
		greetingTitle.textContent = details.greeting;
	}

	if (serviceLine) {
		serviceLine.textContent = details.serving;
	}
}

updateGreeting();
setInterval(updateGreeting, 60_000);

function getTimePeriod(hour) {
	if (hour < 12) {
		return "morning";
	}

	if (hour < 17) {
		return "afternoon";
	}

	return "evening";
}

function updateLoggedInHeader(userName) {
	const now = new Date();
	const period = getTimePeriod(now.getHours());

	if (currentTimeEl) {
		currentTimeEl.textContent = now.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	if (userGreetingEl) {
		userGreetingEl.textContent = `Good ${period}`;
		userGreetingEl.dataset.period = period;
	}

	if (userNameEl) {
		userNameEl.textContent = userName;
	}
}

function showLoggedInState(userName) {
	if (loginCard) {
		loginCard.hidden = true;
	}

	if (createAccountCard) {
		createAccountCard.hidden = true;
	}

	if (appView) {
		appView.hidden = false;
	}

	updateLoggedInHeader(userName);

	if (loggedInTimerId) {
		clearInterval(loggedInTimerId);
	}

	loggedInTimerId = setInterval(() => updateLoggedInHeader(userName), 1_000);
}

if (goToCreateAccountButton) {
	goToCreateAccountButton.addEventListener("click", showCreateAccountState);
}

if (backToLoginButton) {
	backToLoginButton.addEventListener("click", showLoginState);
}

if (createAccountForm) {
	createAccountForm.addEventListener("submit", (event) => {
		event.preventDefault();

		const formData = new FormData(createAccountForm);
		const firstName = String(formData.get("firstName") || "").trim();
		const lastName = String(formData.get("lastName") || "").trim();
		const email = String(formData.get("email") || "").trim();
		const username = String(formData.get("username") || "").trim();
		const password = String(formData.get("password") || "");
		const gender = String(formData.get("gender") || "").trim();
		const age = Number(formData.get("age"));
		const region = String(formData.get("region") || "").trim();

		if (!firstName || !lastName || !email || !username || !password || !gender || !region) {
			window.alert("Please complete all fields.");
			return;
		}

		if (!Number.isInteger(age) || age < 1 || age > 120) {
			window.alert("Please enter a valid age between 1 and 120.");
			return;
		}

		const usernameTaken = accounts.some(
			(account) => normalizeIdentifier(account.username) === normalizeIdentifier(username),
		);

		if (usernameTaken) {
			window.alert("That username is already taken.");
			return;
		}

		const emailTaken = accounts.some(
			(account) => normalizeIdentifier(account.email) === normalizeIdentifier(email),
		);

		if (emailTaken) {
			window.alert("That email is already registered.");
			return;
		}

		accounts.push({
			firstName,
			lastName,
			email,
			username,
			password,
			gender,
			age,
			region,
		});

		createAccountForm.reset();

		if (usernameInput) {
			usernameInput.value = username;
		}

		if (passwordInput) {
			passwordInput.value = "";
		}

		showLoginState();
		window.alert("Account created. Please sign in.");
	});
}

if (loginForm) {
	loginForm.addEventListener("submit", (event) => {
		event.preventDefault();

		const user = usernameInput ? usernameInput.value.trim() : "";
		const password = passwordInput ? passwordInput.value : "";
		const account = findAccountByLoginIdentifier(user);

		if (account && password === account.password) {
			showLoggedInState(account.firstName);
			return;
		}

		window.alert("Invalid login. Check your username/email and password.");
	});
}

