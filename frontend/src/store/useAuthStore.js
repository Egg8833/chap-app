import {create} from 'zustand'
import { axiosInstance } from '../lib/axios'
import toast from 'react-hot-toast'

export const useAuthStore = create(set => ({
  authUser: null,
  isSigninUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,

  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const response = await axiosInstance.get('/auth/check')
      set({authUser: response.data})
    } catch (error) {
      console.error('Error in checkAuth:', error)
      set({authUser: null})
    } finally {
      set({isCheckingAuth: false})
    }
  },

  signup: async formData => {
    try {
      set({isSigningUp: true})
      const response = await axiosInstance.post('/auth/signup', formData)
      set({authUser: response.data})
    } catch (error) {
      console.error('Error in signup:', error)
      toast.error(error.response.data.message || 'An error occurred')
    } finally {
      set({isSigningUp: false})
    }
  },
  login: async formData => {
    try {
      set({isLoggingIn: true})
      const response = await axiosInstance.post('/auth/login', formData)
      set({authUser: response.data})
      toast.success('Logged in successfully')
    } catch (error) {
      console.error('Error in login:', error)
      toast.error(error.response.data.message || 'An error occurred')
    } finally {
      set({isLoggingIn: false})
    }
  },
  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout')
      set({authUser: null})
      toast.success('Logged out successfully')
    } catch (error) {
      toast.error('Failed to log out', error.response.data.message)
      console.error('Error in logout:', error)
    }
  },
    updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      const errorMessage =
         error.response?.data?.message || error.message || 'Unknown error'

       toast.error(errorMessage)
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
}))
