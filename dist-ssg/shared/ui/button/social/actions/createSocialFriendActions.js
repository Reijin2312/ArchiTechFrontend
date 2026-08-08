import { http } from '../../../../../shared/api/http.js';
import { endpoints } from '../../../../../shared/api/endpoints.js';
import { logger } from '../../../../../shared/lib/logger.js';
export function createSocialFriendActions(ctx, deps) {
    const { searchQuery, setFriends, setIncomingRequests, setOutgoingRequests, setLoading, setSearchResults, } = ctx;
    const { loadChats } = deps;
    const loadFriends = async () => {
        try {
            const { data } = await http.get(endpoints.friendsList);
            setFriends(data.friends);
        }
        catch (err) {
            logger.error('Failed to load friends:', err);
        }
    };
    const loadIncomingRequests = async () => {
        try {
            const { data } = await http.get(endpoints.friendsRequestsIncoming);
            setIncomingRequests(data.requests);
        }
        catch (err) {
            logger.error('Failed to load incoming requests:', err);
        }
    };
    const loadOutgoingRequests = async () => {
        try {
            const { data } = await http.get(endpoints.friendsRequestsOutgoing);
            setOutgoingRequests(data.requests);
        }
        catch (err) {
            logger.error('Failed to load outgoing requests:', err);
        }
    };
    const searchUsers = async () => {
        if (searchQuery.length < 2)
            return;
        setLoading(true);
        try {
            const { data } = await http.get(endpoints.friendsSearch(searchQuery));
            setSearchResults(data.users);
        }
        catch (err) {
            logger.error('Search failed:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const refreshSearchIfNeeded = () => {
        if (searchQuery.length >= 2) {
            searchUsers();
        }
    };
    const sendFriendRequest = async (userId) => {
        try {
            await http.post(endpoints.friendsRequestsSend, { userId });
            await loadOutgoingRequests();
            await searchUsers();
        }
        catch (err) {
            logger.error('Failed to send request:', err);
        }
    };
    const acceptRequest = async (userId) => {
        try {
            await http.post(endpoints.friendsRequestsAccept, { userId });
            await loadFriends();
            await loadIncomingRequests();
            await loadOutgoingRequests();
            refreshSearchIfNeeded();
        }
        catch (err) {
            logger.error('Failed to accept request:', err);
        }
    };
    const rejectRequest = async (userId) => {
        try {
            await http.post(endpoints.friendsRequestsReject, { userId });
            await loadIncomingRequests();
            await loadOutgoingRequests();
            refreshSearchIfNeeded();
        }
        catch (err) {
            console.error('Failed to reject request:', err);
        }
    };
    const removeFriend = async (userId) => {
        if (!confirm('Удалить из друзей?'))
            return;
        try {
            await http.post(endpoints.friendsRemove, { userId });
            await loadFriends();
            await loadChats();
            refreshSearchIfNeeded();
        }
        catch (err) {
            console.error('Failed to remove friend:', err);
        }
    };
    const cancelRequest = async (userId) => {
        try {
            await http.post(endpoints.friendsRemove, { userId });
            await loadOutgoingRequests();
            await searchUsers();
        }
        catch (err) {
            console.error('Failed to cancel request:', err);
        }
    };
    return {
        loadFriends,
        loadIncomingRequests,
        loadOutgoingRequests,
        searchUsers,
        refreshSearchIfNeeded,
        sendFriendRequest,
        acceptRequest,
        rejectRequest,
        removeFriend,
        cancelRequest,
    };
}
