import requests
import json
import urllib3
from urllib.parse import unquote
from typing import Dict, Any, Optional, List

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class AfriworkJobApplication:
    def __init__(self, telegram_init_data: str):
        self.base_url = "https://api.afriworket.com"
        self.miniapp_url = "https://miniapp.afriworket.com"
        self.telegram_init_data = telegram_init_data
        self.telegram_id = self._extract_telegram_id()
        
        self.session = requests.Session()
        self.session.verify = False
        
        self.base_headers = self._get_base_headers()
        self.graphql_headers = {}
        
        self.token = None
        self.user_id = None
        self.job_seeker_id = None
        self.default_profile_id = None
        self.platform_id = None
        self.profiles = []
        
    def _extract_telegram_id(self) -> str:
        try:
            decoded = unquote(self.telegram_init_data)
            if 'user=' in decoded:
                user_part = decoded.split('user=')[1].split('&')[0]
                user_data = json.loads(user_part)
                return str(user_data.get('id', ''))
        except:
            pass
        return ""
    
    def _get_base_headers(self) -> Dict:
        return {
            'authority': 'api.afriworket.com:9010',
            'accept': 'application/json',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'content-type': 'application/json',
            'origin': 'https://miniapp.afriworket.com',
            'priority': 'u=1, i',
            'referer': 'https://miniapp.afriworket.com/',
            'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            'x-bot-type': 'APPLICANT',
            'x-telegram-init-data': self.telegram_init_data,
        }
    
    def _get_graphql_headers(self, role: str = "user") -> Dict:
        headers = {
            'accept': 'application/graphql-response+json, application/graphql+json, application/json, text/event-stream, multipart/mixed',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
            'content-type': 'application/json',
            'origin': 'https://miniapp.afriworket.com',
            'priority': 'u=1, i',
            'referer': 'https://miniapp.afriworket.com/',
            'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            'x-hasura-role': role,
        }
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
            
        return headers
    
    def validate_request(self) -> bool:
        url = f"{self.base_url}:9010/mini-app/validate-request"
        payload = {"telegram_id": self.telegram_id}
        
        try:
            response = self.session.post(url, json=payload, headers=self.base_headers)
            if response.status_code == 200:
                data = response.json()
                if "token" in data:
                    self.token = data["token"]
                    try:
                        import base64
                        parts = self.token.split('.')
                        if len(parts) > 1:
                            payload_encoded = parts[1]
                            padding = 4 - len(payload_encoded) % 4
                            if padding < 4:
                                payload_encoded += '=' * padding
                            payload_decoded = base64.b64decode(payload_encoded)
                            payload_json = json.loads(payload_decoded)
                            self.user_id = payload_json.get('sub', '')
                    except:
                        pass
                    return True
            return False
        except:
            return False
    
    def execute_graphql_query(self, operation_name: str, query: str, variables: Dict, role: str = "user") -> Dict[str, Any]:
        url = f"{self.base_url}/v1/graphql"
        payload = {
            "operationName": operation_name,
            "query": query,
            "variables": variables
        }
        
        try:
            response = self.session.post(url, json=payload, headers=self._get_graphql_headers(role))
            return response.json() if response.status_code == 200 else {"error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"error": str(e)}
    
    def fetch_user_by_telegram_id(self) -> bool:
        query = """query FetchUserByTelegramId($telegram_id: String!) {
          users(where: {telegram_id: {_eq: $telegram_id}}) {
            id
            __typename
          }
        }"""
        result = self.execute_graphql_query("FetchUserByTelegramId", query, {"telegram_id": self.telegram_id}, "insert_temporary_user")
        if result.get("data", {}).get("users"):
            self.user_id = result["data"]["users"][0]["id"]
            return True
        return False
    
    def fetch_job_seeker_info(self) -> bool:
        query = """query js_id($user_id: uuid!) {
          job_seekers(where: {user_id: {_eq: $user_id}}) {
            id
            default_profile_id
            finalized_at
            user {
              first_name
              __typename
            }
            __typename
          }
        }"""
        result = self.execute_graphql_query("js_id", query, {"user_id": self.user_id}, "user")
        if result.get("data", {}).get("job_seekers"):
            job_seeker = result["data"]["job_seekers"][0]
            self.job_seeker_id = job_seeker["id"]
            self.default_profile_id = job_seeker["default_profile_id"]
            return True
        return False
    
    def fetch_user_profiles(self) -> bool:
        query = """query FetchUserJobSeekerProfiles($telegram_id: String) {
          job_seeker_profile(
            where: {job_seeker: {user: {telegram_id: {_eq: $telegram_id}}}}
          ) {
            id
            __typename
          }
          job_seeker_draft_profile(
            where: {job_seeker: {user: {telegram_id: {_eq: $telegram_id}}}}
          ) {
            id
            __typename
          }
        }"""
        result = self.execute_graphql_query("FetchUserJobSeekerProfiles", query, {"telegram_id": self.telegram_id}, "user")
        if result.get("data", {}).get("job_seeker_profile"):
            return True
        return False
    
    def get_platform_id(self) -> bool:
        query = """query getPlatformId {
          platforms(where: {name: {_eq: "BOT"}}) {
            id
            name
            __typename
          }
        }"""
        result = self.execute_graphql_query("getPlatformId", query, {}, "job_seeker")
        if result.get("data", {}).get("platforms"):
            self.platform_id = result["data"]["platforms"][0]["id"]
            return True
        return False
    
    def get_cv_info(self) -> Dict[str, Any]:
        query = """query jsCv($id: uuid!) {
          job_seekers(where: {id: {_eq: $id}}) {
            cv
            user {
              first_name
              __typename
            }
            __typename
          }
        }"""
        return self.execute_graphql_query("jsCv", query, {"id": self.job_seeker_id}, "job_seeker")
    
    def fetch_job_seeker_profiles(self) -> bool:
        query = """query FetchJobSeekerProfilesById($job_seeker_id: uuid!) {
          job_seekers_by_pk(id: $job_seeker_id) {
            profiles {
              id
              professional_title
              __typename
            }
            default_profile_id
            __typename
          }
        }"""
        result = self.execute_graphql_query("FetchJobSeekerProfilesById", query, {"job_seeker_id": self.job_seeker_id}, "job_seeker")
        if result.get("data", {}).get("job_seekers_by_pk"):
            self.profiles = result["data"]["job_seekers_by_pk"]["profiles"]
            self.default_profile_id = result["data"]["job_seekers_by_pk"]["default_profile_id"]
            return True
        return False
    
    def apply_to_job(self, application_data: Dict) -> Dict[str, Any]:
        query = """mutation ApplyToJob($application: JobApplicationInput!, $job_id: uuid!, $origin_platform_id: uuid!, $share_id: uuid, $telegramUsername: String, $profile_id: uuid!) {
          apply_to_job(
            application: $application
            job_id: $job_id
            origin_platform_id: $origin_platform_id
            job_share_id: $share_id
            telegram_username: $telegramUsername
            profile_id: $profile_id
          ) {
            application_id
            __typename
          }
        }"""
        
        variables = {
            "application": application_data["application"],
            "job_id": application_data["job_id"],
            "origin_platform_id": self.platform_id,
            "share_id": application_data.get("share_id"),
            "telegramUsername": application_data.get("telegramUsername"),
            "profile_id": application_data["profile_id"]
        }
        
        return self.execute_graphql_query("ApplyToJob", query, variables, "job_seeker")
    
    def get_job_details(self, job_id: str) -> Dict[str, Any]:
        query = """query viewDetails($id: uuid!, $share_id: uuid) {
          view_job_details(obj: {job_id: $id, share_id: $share_id}) {
            id
            title
            approval_status
            job_type
            job_site
            location
            entity {
              name
              type
            }
            sectors {
              sector {
                name
              }
            }
            city {
              en
              country {
                en
              }
            }
            deadline
            vacancy_count
            experience_level
            __typename
          }
        }"""
        return self.execute_graphql_query("viewDetails", query, {"id": job_id}, "user")
    
    def initialize_application(self) -> bool:
        print("Initializing application process...")
        
        if not self.validate_request():
            print("Failed to validate request")
            return False
        
        if not self.fetch_user_by_telegram_id():
            print("Failed to fetch user by Telegram ID")
            return False
        
        if not self.fetch_job_seeker_info():
            print("Failed to fetch job seeker info")
            return False
        
        if not self.fetch_user_profiles():
            print("Failed to fetch user profiles")
            return False
        
        if not self.get_platform_id():
            print("Failed to get platform ID")
            return False
        
        cv_info = self.get_cv_info()
        if "error" in cv_info:
            print("Note: Could not fetch CV info")
        
        if not self.fetch_job_seeker_profiles():
            print("Failed to fetch job seeker profiles")
            return False
        
        print("Application process initialized successfully!")
        return True
    
    def collect_application_data(self, job_id: str) -> Dict[str, Any]:
        print("\n" + "="*60)
        print("JOB APPLICATION FORM")
        print("="*60)
        
        # Get job details
        job_details = self.get_job_details(job_id)
        if job_details.get("data", {}).get("view_job_details"):
            job = job_details["data"]["view_job_details"]
            print(f"\nJob: {job.get('title')}")
            print(f"Company: {job.get('entity', {}).get('name')}")
            print(f"Location: {job.get('city', {}).get('en')}, {job.get('city', {}).get('country', {}).get('en')}")
        
        # Display available profiles
        print(f"\nAvailable Profiles:")
        for i, profile in enumerate(self.profiles, 1):
            print(f"{i}. {profile.get('professional_title', 'Untitled Profile')}")
        
        # Select profile
        while True:
            try:
                profile_choice = input(f"\nSelect profile (1-{len(self.profiles)}) [default: {self.default_profile_id}]: ").strip()
                if not profile_choice:
                    profile_id = self.default_profile_id
                    break
                idx = int(profile_choice) - 1
                if 0 <= idx < len(self.profiles):
                    profile_id = self.profiles[idx]["id"]
                    break
                else:
                    print(f"Please enter a number between 1 and {len(self.profiles)}")
            except ValueError:
                print("Please enter a valid number")
        
        # Get cover letter
        print("\n" + "-"*60)
        print("COVER LETTER")
        print("Maximum 1000 characters")
        print("-"*60)
        cover_letter = ""
        while not cover_letter.strip():
            cover_letter = input("Enter your cover letter: ").strip()
            if len(cover_letter) > 1000:
                print(f"Cover letter too long ({len(cover_letter)} characters). Maximum is 1000 characters.")
                cover_letter = ""
            elif not cover_letter:
                print("Cover letter cannot be empty")
        
        # Get Telegram username
        print("\n" + "-"*60)
        print("TELEGRAM USERNAME (Optional)")
        print("-"*60)
        telegram_username = input("Enter your Telegram username (e.g., @username) or press Enter to skip: ").strip()
        
        # Prepare application data
        application_data = {
            "application": {
                "cover_letter": cover_letter
            },
            "job_id": job_id,
            "profile_id": profile_id,
            "telegramUsername": telegram_username if telegram_username else None,
            "share_id": None
        }
        
        return application_data
    
    def submit_application(self, application_data: Dict) -> bool:
        print("\nSubmitting application...")
        result = self.apply_to_job(application_data)
        
        if result.get("data", {}).get("apply_to_job"):
            application_id = result["data"]["apply_to_job"]["application_id"]
            print(f"\n✅ Application submitted successfully!")
            print(f"Application ID: {application_id}")
            return True
        else:
            print(f"\n❌ Application failed")
            if "errors" in result:
                print(f"Error: {result['errors'][0]['message']}")
            return False
    
    def run_application_process(self, job_id: str = None):
        if not job_id:
            job_id = input("Enter the job ID: ").strip()
        
        if not job_id:
            print("Job ID is required")
            return
        
        print(f"\nStarting application for job ID: {job_id}")
        
        # Initialize the application process
        if not self.initialize_application():
            print("Failed to initialize application process")
            return
        
        # Collect application data from user
        application_data = self.collect_application_data(job_id)
        
        # Review and confirm
        print("\n" + "="*60)
        print("REVIEW YOUR APPLICATION")
        print("="*60)
        print(f"Job ID: {application_data['job_id']}")
        print(f"Profile ID: {application_data['profile_id']}")
        print(f"Cover Letter: {application_data['application']['cover_letter'][:100]}...")
        print(f"Telegram Username: {application_data.get('telegramUsername', 'Not provided')}")
        
        confirm = input("\nDo you want to submit this application? (yes/no): ").strip().lower()
        
        if confirm in ['yes', 'y']:
            # Submit the application
            if self.submit_application(application_data):
                # Save application details
                result = self.apply_to_job(application_data)
                if result.get("data", {}).get("apply_to_job"):
                    application_data['application_id'] = result["data"]["apply_to_job"]["application_id"]
                    with open(f"application_{job_id[:8]}.json", "w", encoding="utf-8") as f:
                        json.dump(application_data, f, indent=2, ensure_ascii=False)
                    print(f"\nApplication details saved to application_{job_id[:8]}.json")
        else:
            print("\nApplication cancelled")


# Main execution
if __name__ == "__main__":
    print("="*60)
    print("AFRIWORK JOB APPLICATION BOT")
    print("="*60)
    
    # Get Telegram init data from user
    print("\nPlease provide your Telegram init data:")
    print("1. Open Chrome DevTools (F12)")
    print("2. Go to Network tab")
    print("3. Look for 'validate-request' request")
    print("4. Copy the value of 'x-telegram-init-data' header")
    print("\nPaste it below (or press Enter to use example data):")
    
    telegram_init_data = input("Telegram init data: ").strip()
    
    if not telegram_init_data:
        # Use the example data for testing
        telegram_init_data = """user=%7B%22id%22%3A1309004964%2C%22first_name%22%3A%22Amanuel%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22am4nuel%22%2C%22language_code%22%3A%22en%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2FqjAqa5aQK3kXfZ7-GDCnl_uuBYiQ-OP2O74hg0ZjVUc.svg%22%7D&chat_instance=4664664791405989786&chat_type=channel&start_param=1da3bfc7-f753-4064-9c2d-0d1af77073d6&auth_date=1769881656&signature=R4lqEgSxL9iTYRog9uqYDtIWcSOf6-1dkoTcikCCdlX1hMD3k5EOWYS9nq3iIFDqYUoUK_l2HSF8QRNhbnFxDw&hash=b787989a534b5da78b7463c9f219c8d399914208c3e92a5fa5f3f73f320a4806"""
        
        print(f"\nUsing example Telegram data (ID: 1309004964)")
    
    # Create application bot instance
    bot = AfriworkJobApplication(telegram_init_data)
    
    # Run the application process
    bot.run_application_process()
    
    # Option to apply for multiple jobs
    while True:
        another = input("\nDo you want to apply for another job? (yes/no): ").strip().lower()
        if another in ['yes', 'y']:
            job_id = input("Enter the job ID: ").strip()
            if job_id:
                bot.run_application_process(job_id)
            else:
                print("Job ID is required")
        else:
            print("\nThank you for using Afriwork Job Application Bot!")
            break