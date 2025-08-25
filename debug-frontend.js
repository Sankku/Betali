// Run this in browser console to debug organization context
console.log('=== ORGANIZATION CONTEXT DEBUG ===');

// Check localStorage
console.log('🗄️ LocalStorage:');
console.log('currentOrganizationId:', localStorage.getItem('currentOrganizationId'));
console.log('currentOrganizationContext:', localStorage.getItem('currentOrganizationContext'));

// Check if React dev tools are available
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log('⚛️ React DevTools detected');
} else {
  console.log('❌ React DevTools not found');
}

// Check if TanStack Query dev tools cache is accessible
try {
  const queryClient = window.__REACT_QUERY_STATE__;
  if (queryClient) {
    console.log('📊 TanStack Query cache:', queryClient);
  }
} catch (e) {
  console.log('❌ Cannot access TanStack Query state');
}

// Check network requests for organizations
console.log('🌐 Network requests - check Network tab for:');
console.log('- GET /api/organizations/my');
console.log('- POST /api/organizations/{id}/switch');

// Check user authentication
console.log('🔐 Auth token in localStorage:', localStorage.getItem('token') ? 'Present' : 'Missing');

console.log('=== END DEBUG ===');