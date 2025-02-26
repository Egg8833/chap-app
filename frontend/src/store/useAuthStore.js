import {create} from 'zustand'
import { axiosInstance } from '../lib/axios'

export const useAuthStore = create((set) => ({
  authUser: null,
  isSigninUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,

  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const response = await axiosInstance.get('/auth/check')
      set({authUser: response.data})
    }
    catch (error) {
      console.error('Error in checkAuth:', error)
      set({authUser: null})
    }
    finally {
      set({isCheckingAuth: false})
    }
  },

  singup: async (formData) => {
    try {
      set({isSigningUp: true})
      const response = await axiosInstance.post('/auth/signup', formData)
      set({authUser: response.data})
    }
    catch (error) {
      console.error('Error in signup:', error)
    }
    finally {
      set({isSigningUp: false})
    }
  },

}))
