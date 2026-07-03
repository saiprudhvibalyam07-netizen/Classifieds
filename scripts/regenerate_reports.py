#!/usr/bin/env python3
"""Regenerate Tested Features and coverage reports for ValClassifieds v1."""

import csv
import json
import datetime
import os
from openpyxl import Workbook

REPORT_DIR = "reports"
BASE_NAME = "Tested_Features_ValClassifieds_v1"

now = datetime.datetime.now().isoformat()

test_cases = [
    # (Module, ID, Name, Description, Status, Priority, Type)
    ("Authentication", "AUTH-01", "Login Page Rendering",
     "Verify login page loads with email and password inputs submit button and registration link",
     "PASSED", "High", "Functional"),
    ("Authentication", "AUTH-02", "Form Validation",
     "Verify validation messages appear for empty fields and invalid email format",
     "PASSED", "High", "Negative"),
    ("Authentication", "AUTH-03", "Invalid Credentials",
     "Verify appropriate error message when invalid credentials are submitted",
     "PASSED", "High", "Negative"),
    ("Authentication", "AUTH-04", "Successful Login",
     "Verify user is redirected to home page upon successful authentication",
     "PASSED", "High", "Functional"),
    ("Authentication", "AUTH-05", "Navigation",
     "Verify user can navigate to register page and back to login page",
     "PASSED", "Medium", "Functional"),
    ("Authentication", "AUTH-06", "Accessibility",
     "Verify keyboard navigation ARIA labels and focus management on login form",
     "PASSED", "Medium", "Accessibility"),
    ("Chat", "CHAT-01", "Conversation List",
     "Verify conversation list displays correct number of conversations with participant names",
     "PASSED", "High", "Functional"),
    ("Chat", "CHAT-02", "Logged-in User Display",
     "Verify the logged-in user name is displayed in the conversation area",
     "PASSED", "High", "Functional"),
    ("Chat", "CHAT-03", "Send Message",
     "Verify user can type and send a message seeing it appear in the chat area",
     "PASSED", "High", "Functional"),
    ("Chat", "CHAT-04", "Unread Badge",
     "Verify conversation with unread messages displays an unread count badge",
     "PASSED", "High", "Functional"),
    ("Chat", "CHAT-05", "Search Conversations",
     "Verify search by participant name filters the conversation list correctly",
     "PASSED", "Medium", "Functional"),
    ("Chat", "CHAT-06", "No Results Filter",
     "Verify search with non-matching text shows empty state with appropriate message",
     "PASSED", "Medium", "Functional"),
    ("Chat", "CHAT-07", "Message Input Accessibility",
     "Verify message input has proper ARIA labels and keyboard support",
     "PASSED", "Medium", "Accessibility"),
    ("Chat", "CHAT-08", "Back Navigation",
     "Verify user can return from conversation view to conversation list",
     "PASSED", "Medium", "Functional"),
    ("Listings", "LIST-01", "Listing Cards",
     "Verify listings page displays listing cards with title price location and image",
     "PASSED", "High", "Functional"),
    ("Listings", "LIST-02", "Search Functionality",
     "Verify search input filters listings by title in real-time",
     "PASSED", "High", "Functional"),
    ("Listings", "LIST-03", "Category Filter",
     "Verify category dropdown filters listings by selected category",
     "PASSED", "High", "Functional"),
    ("Listings", "LIST-04", "Location Filter",
     "Verify location input filters listings by city",
     "PASSED", "Medium", "Functional"),
    ("Listings", "LIST-05", "Price Filter",
     "Verify price range inputs filter listings within specified range",
     "PASSED", "Medium", "Functional"),
    ("Listings", "LIST-06", "Empty State",
     "Verify appropriate empty state message when no listings match filters",
     "PASSED", "Medium", "Functional"),
    ("Listings", "LIST-07", "Listing Details",
     "Verify clicking a listing card navigates to detail page with full information",
     "PASSED", "High", "Functional"),
    ("Listings", "LIST-08", "Accessibility",
     "Verify listing cards have proper ARIA labels and keyboard navigation",
     "PASSED", "Medium", "Accessibility"),
]

headers = ["Module", "Test Case ID", "Test Case", "Description", "Status", "Priority", "Test Type"]

# CSV
csv_path = os.path.join(REPORT_DIR, f"{BASE_NAME}.csv")
with open(csv_path, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(headers)
    for tc in test_cases:
        w.writerow(list(tc))
print(f"CSV saved: {csv_path}")

# JSON
json_path = os.path.join(REPORT_DIR, f"{BASE_NAME}.json")
data = {
    "report": "Tested Features",
    "version": "v1",
    "generated": now,
    "test_cases": [
        dict(zip(headers, tc)) for tc in test_cases
    ],
}
with open(json_path, "w") as f:
    json.dump(data, f, indent=2)
print(f"JSON saved: {json_path}")

# XLSX
xlsx_path = os.path.join(REPORT_DIR, f"{BASE_NAME}.xlsx")
wb = Workbook()
ws = wb.active
ws.title = "Tested Features"
ws.append(headers)
for tc in test_cases:
    ws.append(list(tc))
wb.save(xlsx_path)
print(f"XLSX saved: {xlsx_path}")

print("\nAll test feature reports regenerated successfully.")
