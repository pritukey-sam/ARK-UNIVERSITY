const API_URL = '/api';

export const api = {
 async request(endpoint: string, options: RequestInit = {}) {
 const token = localStorage.getItem('token');
 const headers: any = {
 ...(token ? { Authorization: `Bearer ${token}` } : {}),
 ...options.headers,
 };
 if (!(options.body instanceof FormData)) {
 headers['Content-Type'] = 'application/json';
 }
 const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { detail: text || `Server Error (${response.status})` };
  }
 if (!response.ok) {
 if (response.status === 402) {
 window.location.href = '/payment';
 return;
 }
 if (response.status !== 401) {
 console.error(`API Error [${response.status}] on ${endpoint}:`, text);
 }
 let errorMessage = 'Something went wrong';
 if (typeof data.detail === 'string') errorMessage = data.detail;
 else if (Array.isArray(data.detail)) errorMessage = data.detail.map((e: any) => e.msg).join(', ');
 else if (data.error) errorMessage = data.error;
 throw new Error(errorMessage);
 }
 return data;
 },

 get: (endpoint: string) => api.request(endpoint, { method: 'GET' }),
 post: (endpoint: string, body: any) => api.request(endpoint, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
 put: (endpoint: string, body: any) => api.request(endpoint, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
 delete: (endpoint: string) => api.request(endpoint, { method: 'DELETE' }),
 patch: (endpoint: string, body: any) => api.request(endpoint, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),

 superAdmin: {
 getCompanies: () => api.get('/super-admin/companies'),
 getStats: () => api.get('/super-admin/stats'),
 getLogs: () => api.get('/super-admin/logs'),
 getGrowth: () => api.get('/super-admin/growth'),
 createCompany: (data: any) => api.post('/super-admin/companies', data),
 updateCompany: (id: number, data: any) => api.patch(`/super-admin/companies/${id}`, data),
 getRegistrationRequests: () => api.get('/super-admin/registration-requests'),
 approveRegistration: (id: number, data: any) => api.post(`/super-admin/registration-requests/${id}/approve`, data),
 rejectRegistration: (id: number) => api.post(`/super-admin/registration-requests/${id}/reject`, {}),
 },

 auth: {
 login: (credentials: any) => api.request('/login', { method: 'POST', body: JSON.stringify(credentials) }),
 },

 admin: {
 uploadVideo: (formData: FormData) => api.request('/upload-video', { method: 'POST', body: formData }),
 createUser: (userData: any) => api.request('/create-user', { method: 'POST', body: JSON.stringify(userData) }),
 updateUser: (userId: number, data: any) => api.request(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
 createCourse: (courseData: any) => api.request('/create-course', { method: 'POST', body: JSON.stringify(courseData) }),
 updateCourse: (courseId: number, data: any) => api.request(`/courses/${courseId}`, { method: 'PUT', body: JSON.stringify(data) }),
 deleteCourse: (courseId: number) => api.request(`/courses/${courseId}`, { method: 'DELETE' }),
 getUsers: () => api.request('/users'),
 getNextUserId: (role: string) => api.request(`/users/next-id?role=${role}`),
 deleteUser: (userId: number) => api.request(`/users/${userId}`, { method: 'DELETE' }),
 createModule: (courseId: number, data: any) => api.request(`/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify(data) }),
 updateModule: (moduleId: number, data: any) => api.request(`/courses/modules/${moduleId}`, { method: 'PUT', body: JSON.stringify(data) }),
 deleteModule: (moduleId: number) => api.request(`/modules/${moduleId}`, { method: 'DELETE' }),
 addVideo: (moduleId: number, data: any) => api.request(`/modules/${moduleId}/videos`, { method: 'POST', body: JSON.stringify(data) }),
 addNotes: (moduleId: number, formData: FormData) => api.request(`/modules/${moduleId}/notes`, { method: 'POST', body: formData }),
 addAssignment: (moduleId: number, formData: FormData) => api.request(`/modules/${moduleId}/assignments`, { method: 'POST', body: formData }),
 createQuiz: (moduleId: number, data: any) => api.request(`/modules/${moduleId}/quizzes`, { method: 'POST', body: JSON.stringify(data) }),
 updateQuiz: (quizId: number, data: any) => api.request(`/quizzes/${quizId}`, { method: 'PUT', body: JSON.stringify(data) }),
 deleteVideo: (id: number) => api.request(`/videos/${id}`, { method: 'DELETE' }),
 deleteNotes: (id: number) => api.request(`/notes/${id}`, { method: 'DELETE' }),
 deleteAssignment: (id: number) => api.request(`/assignments/${id}`, { method: 'DELETE' }),
 deleteQuiz: (id: number) => api.request(`/quizzes/${id}`, { method: 'DELETE' }),
 deleteSubmission: (id: number) => api.request(`/submissions/${id}`, { method: 'DELETE' }),
 bulkQuizPreview: (moduleId: number, formData: FormData) => api.request(`/modules/${moduleId}/quizzes/bulk-preview`, { method: 'POST', body: formData }),
 bulkQuizConfirm: (moduleId: number, data: any) => api.request(`/modules/${moduleId}/quizzes/bulk-confirm`, { method: 'POST', body: JSON.stringify(data) }),
 updateVideo: (videoId: number, data: any) => api.request(`/videos/${videoId}`, { method: 'PUT', body: JSON.stringify(data) }),
 getUserDetails: (userId: number) => api.request(`/users/${userId}`, { method: 'GET' }),
 },

 hr: {
 assignCourse: (assignment: any) => api.request('/assign-course', { method: 'POST', body: JSON.stringify(assignment) }),
 getEmployeeProgress: () => api.request('/employee-progress'),
 getAllSubmissions: () => api.request('/submissions'),
 getHrAnalytics: () => api.request('/dashboard/hr-analytics'),
 },

 employee: {
 getMyCourses: () => api.request('/my-courses'),
 completeCourse: (courseId: number) => api.request(`/complete-course/${courseId}`, { method: 'POST' }),
 submitAssignment: (moduleId: number, formData: FormData) => api.request(`/modules/${moduleId}/submit`, { method: 'POST', body: formData }),
 attemptQuiz: (quizId: number, data: { answers: any[], time_taken: number }) => api.request(`/quizzes/${quizId}/attempt`, { method: 'POST', body: JSON.stringify(data) }),
 getMySubmissions: () => api.request('/my-submissions'),
 getEmployeeAnalytics: () => api.request('/dashboard/employee-analytics'),
 markModuleComplete: (courseId: number, moduleId: number) => api.request('/progress/complete', { method: 'POST', body: JSON.stringify({ course_id: courseId, module_id: moduleId }) }),
 markModuleIncomplete: (courseId: number, moduleId: number) => api.request('/progress/incomplete', { method: 'POST', body: JSON.stringify({ course_id: courseId, module_id: moduleId }) }),
 getCourseProgress: (courseId: number) => api.request(`/progress/course/${courseId}`),
 updateDetailedProgress: (data: { course_id: number, module_id: number, video_watched?: boolean, notes_viewed?: boolean, assignment_submitted?: boolean, quiz_completed?: boolean, last_video_timestamp?: number, last_tab?: string }) => api.request('/progress/update', { method: 'PATCH', body: JSON.stringify(data) }),
 getModuleProgressDetail: (courseId: number, moduleId: number) => api.request(`/progress/module/${courseId}/${moduleId}`),
 updateVideoProgress: (data: { video_id: number, watched_seconds?: number, completed?: boolean, module_id?: number }) => api.request(`/progress/video`, { method: 'POST', body: JSON.stringify(data) }),
 markNotesComplete: (data: { module_id: number, completed: boolean }) => api.request(`/progress/notes`, { method: 'POST', body: JSON.stringify(data) }),
 getVideoUrl: (videoId: number) => api.request(`/courses/video-url/${videoId}`),
 checkAccess: (courseId: number) => api.request(`/courses/${courseId}/check-access`),
 },

 common: {
 getCourses: (params: { q?: string, status?: string, sort?: string } = {}) => {
 const searchParams = new URLSearchParams();
 if (params.q) searchParams.append('q', params.q);
 if (params.status) searchParams.append('status', params.status);
 if (params.sort) searchParams.append('sort', params.sort);
 const queryStr = searchParams.toString();
 return api.request(`/courses${queryStr ? '?' + queryStr : ''}`);
 },
 getCourse: (id: number) => api.request(`/courses/${id}`),
 enroll: (id: number) => api.request(`/courses/${id}/enroll`, { method: 'POST' }),
 getStats: () => api.request('/stats'),
 getModulesByCourse: (course_id: number) => api.request(`/courses/${course_id}/modules`),
 getModule: (module_id: number) => api.request(`/modules/${module_id}`),
 getModuleQuizzes: (moduleId: number) => api.request(`/modules/${moduleId}/quizzes`),
 getQuiz: (quizId: number) => api.request(`/quizzes/${quizId}`),
 getActivityFeed: () => api.request('/dashboard/activity'),
 search: (q: string) => api.request(`/search?q=${encodeURIComponent(q)}`),
 getProfile: () => api.request('/account/profile'),
 updateProfile: (data: any) => api.request('/account/profile', { method: 'PATCH', body: JSON.stringify(data) }),
 uploadAvatar: (formData: FormData) => api.request('/account/avatar', { method: 'POST', body: formData }),
 deleteAvatar: () => api.request('/account/avatar', { method: 'DELETE' }),
 },

 dashboard: {
 getAnalytics: () => api.request('/dashboard/analytics'),
 getActivity: () => api.request('/dashboard/activity'),
 getHrAnalytics: () => api.request('/dashboard/hr-analytics'),
 getEmployeeAnalytics: () => api.request('/dashboard/employee-analytics'),
 },

 ai: {
 ask: (moduleId: number, question: string) => api.request('/ai/ask', { method: 'POST', body: JSON.stringify({ module_id: moduleId, user_question: question }) }),
 summarize: (moduleId: number) => api.request('/ai/summarize', { method: 'POST', body: JSON.stringify({ module_id: moduleId }) }),
 assignmentHelp: (assignmentId: number) => api.request('/ai/assignment-help', { method: 'POST', body: JSON.stringify({ assignment_id: assignmentId }) }),
 generateQuiz: (moduleId: number) => api.request('/ai/generate-quiz-fixed', { method: 'POST', body: JSON.stringify({ module_id: moduleId }) }),
 evaluateSubmission: (assignmentId: number, formData: FormData) => api.request(`/ai/evaluate?assignment_id=${assignmentId}`, { method: 'POST', body: formData }),
 },
 
 assignments: {
 request: (data: { user_id: number, course_id: number, hr_id: number, requested_due_date?: string, note?: string }) => api.request('/assignments/request', { method: 'POST', body: JSON.stringify(data) }),
 getPending: () => api.request('/assignments/pending'),
 getAll: () => api.request('/assignments/all'),
 approve: (requestId: number) => api.request(`/assignments/${requestId}/approve`, { method: 'POST' }),
 reject: (requestId: number) => api.request(`/assignments/${requestId}/reject`, { method: 'POST' }),
 cancel: (requestId: number) => api.request(`/assignments/${requestId}/cancel`, { method: 'DELETE' }),
 getCount: () => api.request('/assignments/count'),
 },

 payment: {
 fake: () => api.post('/payment/fake', {}),
 },

 notifications: {
 getAll: () => api.get('/notifications'),
 getUnreadCount: () => api.get('/notifications/unread-count'),
 markAsRead: (id: number) => api.post(`/notifications/${id}/read`, {}),
 markAllRead: () => api.post('/notifications/mark-all-read', {}),
 },

};