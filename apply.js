const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

class AfriworkJobApplication {
    constructor(telegramInitData, config) {
        this.baseUrl = 'https://api.afriworket.com';
        this.miniappUrl = 'https://miniapp.afriworket.com';
        this.telegramInitData = telegramInitData;
        this.config = config; // Store config
        this.telegramId = this._extractTelegramId();
        
        this.baseHeaders = this._getBaseHeaders();
        this.token = null;
        this.userId = null;
        this.jobSeekerId = null;
        this.defaultProfileId = null;
        this.platformId = null;
        this.profiles = [];
        
        // Initialize Gemini AI
        const apiKey = this.config?.env?.geminiApiKey || process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        // User requested gemini-3-flash-preview
        this.model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    }

    _extractTelegramId() {
        try {
            const decoded = decodeURIComponent(this.telegramInitData);
            if (decoded.includes('user=')) {
                const userPart = decoded.split('user=')[1].split('&')[0];
                const userData = JSON.parse(userPart);
                return String(userData.id || '');
            }
        } catch (error) {
            console.error('Error extracting Telegram ID:', error.message);
        }
        return '';
    }

    _getBaseHeaders() {
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
            'x-telegram-init-data': this.telegramInitData,
        };
    }

    _getGraphqlHeaders(role = 'user') {
        const headers = {
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
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    async validateRequest() {
        const url = `${this.baseUrl}:9010/mini-app/validate-request`;
        const payload = { telegram_id: this.telegramId };

        try {
            const response = await axios.post(url, payload, {
                headers: this.baseHeaders,
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            });

            if (response.status === 200 && response.data.token) {
                this.token = response.data.token;
                
                // Extract user ID from JWT token
                try {
                    const parts = this.token.split('.');
                    if (parts.length > 1) {
                        const payloadEncoded = parts[1];
                        const payloadDecoded = Buffer.from(payloadEncoded, 'base64').toString('utf-8');
                        const payloadJson = JSON.parse(payloadDecoded);
                        this.userId = payloadJson.sub || '';
                    }
                } catch (error) {
                    console.error('Error decoding JWT:', error.message);
                }
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Validate request error:', error.message);
            return false;
        }
    }

    async executeGraphqlQuery(operationName, query, variables, role = 'user') {
        const url = `${this.baseUrl}/v1/graphql`;
        const payload = {
            operationName,
            query,
            variables
        };

        try {
            const response = await axios.post(url, payload, {
                headers: this._getGraphqlHeaders(role),
                httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
            });

            return response.status === 200 ? response.data : { error: `HTTP ${response.status}` };
        } catch (error) {
            return { error: error.message };
        }
    }

    async fetchUserByTelegramId() {
        const query = `query FetchUserByTelegramId($telegram_id: String!) {
          users(where: {telegram_id: {_eq: $telegram_id}}) {
            id
            __typename
          }
        }`;
        
        const result = await this.executeGraphqlQuery(
            'FetchUserByTelegramId',
            query,
            { telegram_id: this.telegramId },
            'insert_temporary_user'
        );

        if (result.data?.users?.length > 0) {
            this.userId = result.data.users[0].id;
            return true;
        }
        return false;
    }

    async fetchJobSeekerInfo() {
        const query = `query js_id($user_id: uuid!) {
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
        }`;

        const result = await this.executeGraphqlQuery('js_id', query, { user_id: this.userId }, 'user');

        if (result.data?.job_seekers?.length > 0) {
            const jobSeeker = result.data.job_seekers[0];
            this.jobSeekerId = jobSeeker.id;
            this.defaultProfileId = jobSeeker.default_profile_id;
            return true;
        }
        return false;
    }

    async fetchUserProfiles() {
        const query = `query FetchUserJobSeekerProfiles($telegram_id: String) {
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
        }`;

        const result = await this.executeGraphqlQuery(
            'FetchUserJobSeekerProfiles',
            query,
            { telegram_id: this.telegramId },
            'user'
        );

        return result.data?.job_seeker_profile ? true : false;
    }

    async getPlatformId() {
        const query = `query getPlatformId {
          platforms(where: {name: {_eq: "BOT"}}) {
            id
            name
            __typename
          }
        }`;

        const result = await this.executeGraphqlQuery('getPlatformId', query, {}, 'job_seeker');

        if (result.data?.platforms?.length > 0) {
            this.platformId = result.data.platforms[0].id;
            return true;
        }
        return false;
    }

    async fetchJobSeekerProfiles() {
        const query = `query FetchJobSeekerProfilesById($job_seeker_id: uuid!) {
          job_seekers_by_pk(id: $job_seeker_id) {
            profiles {
              id
              professional_title
              __typename
            }
            default_profile_id
            __typename
          }
        }`;

        const result = await this.executeGraphqlQuery(
            'FetchJobSeekerProfilesById',
            query,
            { job_seeker_id: this.jobSeekerId },
            'job_seeker'
        );

        if (result.data?.job_seekers_by_pk) {
            this.profiles = result.data.job_seekers_by_pk.profiles;
            this.defaultProfileId = result.data.job_seekers_by_pk.default_profile_id;
            return true;
        }
        return false;
    }

    async getJobDetails(jobId) {
        const query = `query viewDetails($id: uuid!, $share_id: uuid) {
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
            description
            __typename
          }
        }`;

        return await this.executeGraphqlQuery('viewDetails', query, { id: jobId }, 'user');
    }

    async applyToJob(applicationData) {
        const query = `mutation ApplyToJob($application: JobApplicationInput!, $job_id: uuid!, $origin_platform_id: uuid!, $share_id: uuid, $telegramUsername: String, $profile_id: uuid!) {
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
        }`;

        const variables = {
            application: applicationData.application,
            job_id: applicationData.job_id,
            origin_platform_id: this.platformId,
            share_id: applicationData.share_id || null,
            telegramUsername: applicationData.telegramUsername,
            profile_id: applicationData.profile_id
        };

        return await this.executeGraphqlQuery('ApplyToJob', query, variables, 'job_seeker');
    }

    async generateCoverLetter(jobDescription) {
        try {
            // Load AI prompt and expertise from config
            const config = this.config;
            const expertise = config.expertise || {};
            
            // Replace placeholders in the AI prompt
            let prompt = config.aiPrompt
                .replace('{jobDescription}', jobDescription)
                .replace('{skills}', (expertise.skills || []).join(', '))
                .replace('{experience}', (expertise.experience || []).join('. '))
                .replace('{education}', expertise.education || 'Not specified')
                .replace('{languages}', (expertise.languages || []).join(', '))
                .replace('{additionalInfo}', expertise.additionalInfo || '');

            console.log('🤖 Generating personalized cover letter with AI...');
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let coverLetter = response.text().trim();

            // Count words (approximately 500 words = ~3000 characters)
            const wordCount = coverLetter.split(/\s+/).length;
            console.log(`📝 Generated cover letter: ${wordCount} words, ${coverLetter.length} characters`);

            // Ensure it's within the 1000 character limit (Afriwork API limit)
            if (coverLetter.length > 1000) {
                console.log(`⚠️  Cover letter too long (${coverLetter.length} chars), truncating to 1000...`);
                coverLetter = coverLetter.substring(0, 997) + '...';
            }

            console.log(`✅ Cover letter ready (${coverLetter.length} characters)`);
            return coverLetter;
        } catch (error) {
            console.error('Error generating cover letter:', error.message);
            // Fallback cover letter
            return 'I am writing to express my strong interest in this position. With my technical skills and experience in software development, I am confident I would be a valuable addition to your team. I am eager to contribute to your organization and grow professionally. Thank you for considering my application.';
        }
    }

    async initializeApplication() {
        console.log('🔄 Initializing application process...');

        if (!await this.validateRequest()) {
            console.error('❌ Failed to validate request');
            return false;
        }

        if (!await this.fetchUserByTelegramId()) {
            console.error('❌ Failed to fetch user by Telegram ID');
            return false;
        }

        if (!await this.fetchJobSeekerInfo()) {
            console.error('❌ Failed to fetch job seeker info');
            return false;
        }

        if (!await this.fetchUserProfiles()) {
            console.error('❌ Failed to fetch user profiles');
            return false;
        }

        if (!await this.getPlatformId()) {
            console.error('❌ Failed to get platform ID');
            return false;
        }

        if (!await this.fetchJobSeekerProfiles()) {
            console.error('❌ Failed to fetch job seeker profiles');
            return false;
        }

        console.log('✅ Application process initialized successfully!');
        return true;
    }

    async autoApply(jobId, jobDescriptionFromMessage = null, telegramUsername = null, manualCoverLetter = null) {
        console.log(`🚀 Starting auto-apply process for Job ID: ${jobId}`);

        try {
            // 1. Authenticate
            if (!await this.validateRequest()) throw new Error('Authentication failed (Invalid Telegram Init Data)');
            
            // 2. Fetch User & Job Seeker Info
            if (!await this.fetchUserByTelegramId()) throw new Error('User not found on Afriwork');
            if (!await this.fetchJobSeekerInfo()) throw new Error('Job seeker profile not found');
            if (!await this.getPlatformId()) throw new Error('Platform ID "BOT" not found');
            if (!await this.fetchJobSeekerProfiles()) throw new Error('No job seeker profiles found');

            // 3. Get Job Details & Verify Eligibility
            let jobData = null;
            try {
                const jobDetails = await this.getJobDetails(jobId);
                if (jobDetails.data?.view_job_details?.[0]) {
                     jobData = jobDetails.data.view_job_details[0];
                }
            } catch (e) { console.warn("Could not fetch job details:", e); }

            if (jobData) {
                console.log(`📋 Job Title: ${jobData.title}`);
                console.log(`🏢 Company: ${jobData.entity?.name}`);

                if (jobData.approval_status !== 'approved') throw new Error('Job is not approved for application');
                
                const deadline = new Date(jobData.deadline);
                if (deadline < new Date()) throw new Error('Job deadline has passed');
            } else {
                console.log("⚠️ Could not verify job details (possibly manual test ID). Proceeding with best effort...");
            }

            // 4. Generate Cover Letter (or use manual)
            let coverLetter = manualCoverLetter;
            if (!coverLetter) {
                 const descriptionToUse = jobDescriptionFromMessage || (jobData ? jobData.description : "Software Job");
                 coverLetter = await this.generateCoverLetter(descriptionToUse);
            } else {
                 console.log('📝 Using manually edited cover letter.');
            }

            // 5. Submit Application
            const applicationData = {
                application: {
                    cover_letter: coverLetter,
                    files: [] // Add files if needed
                },
                job_id: jobId,
                share_id: null,
                telegramUsername: telegramUsername || this.config.env.telegramUsername,
                profile_id: this.defaultProfileId
            };

            const applyResult = await this.applyToJob(applicationData);
            
            if (applyResult.error) {
                 // Check for generic constraint violations (often means already applied)
                 if (applyResult.error.includes('Uniqueness violation') || applyResult.error.includes('uniqueness')) {
                     throw new Error('You have already applied to this job.');
                 }
                 throw new Error(`Submission failed: ${applyResult.error}`);
            }

            console.log('✅ Application submitted successfully!');
            return { 
                success: true, 
                jobTitle: jobData ? jobData.title : "Unknown Job",
                companyName: jobData ? jobData.entity?.name : "Unknown Company",
                applicationId: applyResult.data?.apply_to_job?.application_id
            };

        } catch (error) {
            console.error(`❌ Auto-apply failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

module.exports = AfriworkJobApplication;
