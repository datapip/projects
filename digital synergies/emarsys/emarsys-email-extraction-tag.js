// @ts-nocheck
/**
 * Emarsys Email Capture — GTM Custom HTML Tag
 * Client: schiesser.com
 *
 * Persists the user's email under key "em_e" in sessionStorage and as a
 * session cookie — ready for the main Emarsys tag to read via getEmail().
 *
 * Two capture strategies:
 *   1. DOM Ready scan — catches browser autofill / password manager pre-fill
 *   2. blur listener  — catches manual entry when the user leaves the field
 *
 * Covered inputs (name="lgn_usr" or name="editval[oxuser__oxusername]"):
 *   - Login page            #lgn_user       name="lgn_usr"
 *   - Registration          #email          name="lgn_usr"
 *   - Checkout (existing)   #username       name="lgn_usr"
 *   - Checkout (new/guest)  #email          name="lgn_usr"
 *   - Newsletter            #email_footer   name="editval[oxuser__oxusername]"
 *
 * GTM Trigger: DOM Ready — All Pages
 */

(function () {
  var KEY = "em_e";

  // Check 1: scan for pre-filled values on tag execution
  scanInputs();

  // Check 2: scan for pre-filled values on window loaded
  window.addEventListener("load", scanInputs);

  // Check 3: blur listener for manual entry
  document.addEventListener(
    "blur",
    function (e) {
      var input = e.target;
      if (!input || input.tagName !== "INPUT" || !isKnownInput(input)) {
        return;
      }
      if (isValidEmail(input.value)) {
        persist(input.value);
      }
    },
    true,
  );

  // ----- Helper functions -----

  function isValidEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((str || "").trim().toLowerCase());
  }

  function persist(email) {
    var normalised = email.trim().toLowerCase();
    try { localStorage.setItem(KEY, normalised); } catch (e) {}
    try {
      var expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = KEY + '=' + encodeURIComponent(normalised) + ';path=/;SameSite=Lax;Secure;expires=' + expires;
    } catch (e) {}
  }

  function isKnownInput(input) {
    return (
      input.name === "lgn_usr" ||
      input.name === "editval[oxuser__oxusername]" ||
      input.type === "email"
    );
  }

  function scanInputs() {
    var inputs = document.querySelectorAll(
      'input[name="lgn_usr"], input[name="editval[oxuser__oxusername]"], input[type="email"]',
    );
    for (var i = 0; i < inputs.length; i++) {
      if (isValidEmail(inputs[i].value)) {
        persist(inputs[i].value);
        break;
      }
    }
  }
})();
