"""
Sample Automation Tests using Selenium WebDriver (Python) for AutoTest Playground

Prerequisites:
    pip install selenium pytest

To run:
    pytest tests/test_selenium.py
"""

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://localhost:5173"

@pytest.fixture
def driver():
    options = webdriver.ChromeOptions()
    # options.add_argument("--headless")
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(5)
    yield driver
    driver.quit()

def test_login_flow(driver):
    driver.get(f"{BASE_URL}/auth")

    # Enter credentials
    driver.find_element(By.CSS_SELECTOR, "[data-testid='username-input']").send_keys("admin")
    driver.find_element(By.CSS_SELECTOR, "[data-testid='password-input']").send_keys("password123")
    driver.find_element(By.CSS_SELECTOR, "[data-testid='login-submit-btn']").click()

    # Wait for welcome message
    welcome_elem = WebDriverWait(driver, 5).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid='user-welcome-message']"))
    )
    assert "System Admin" in welcome_elem.text

    # Logout
    driver.find_element(By.CSS_SELECTOR, "[data-testid='logout-btn']").click()
    logout_msg = WebDriverWait(driver, 5).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid='logout-success-msg']"))
    )
    assert logout_msg.is_displayed()

def test_javascript_alert(driver):
    driver.get(f"{BASE_URL}/dialogs")

    driver.find_element(By.CSS_SELECTOR, "[data-testid='js-confirm-btn']").click()
    alert = driver.switch_to.alert
    assert "Are you sure" in alert.text
    alert.accept()

    result = driver.find_element(By.CSS_SELECTOR, "[data-testid='js-confirm-result']").text
    assert "User accepted" in result

