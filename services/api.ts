// API Configuration
// In development, use relative path (Vite proxy handles it)
// In production, use full API URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.SERVER_URL
  ? `${import.meta.env.SERVER_URL}/api`
  : "/api";

// API Service class
class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem("authToken");
  }

  // Set authentication token
  setToken(token: string) {
    this.token = token;
    localStorage.setItem("authToken", token);
  }

  // Clear authentication token
  clearToken() {
    this.token = null;
    localStorage.removeItem("authToken");
  }

  // Get headers with authentication
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json"
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Make API request
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        // Try to get JSON response first (for special cases like force password change)
        let responseData = null;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          // If parsing JSON failed, continue with error handling
        }

        // Handle 401 - Authentication required
        if (response.status === 401) {
          this.clearToken();
          window.dispatchEvent(new Event('auth:expired'));
          throw new Error("Authentication required");
        }

        // Handle 403 - Check if it's a force password change scenario
        if (response.status === 403 && responseData && responseData.data && responseData.data.requiresPasswordChange) {
          // Return the response data instead of throwing error
          // This allows login() method to handle it properly
          return responseData;
        }

        // Get error message from response data
        let errorMessage = null;
        if (responseData && responseData.message) {
          errorMessage = responseData.message;
        }

        if (errorMessage) {
          throw new Error(errorMessage);
        }
        
        // Handle specific status codes with user-friendly messages if JSON parsing fails or has no message
        if (response.status === 409) {
             throw new Error("Data conflict: This item already exists.");
        }
        if (response.status === 403) {
             throw new Error("Access denied: You do not have permission.");
        }
        if (response.status === 413) {
             throw new Error("File too large. Please choose a smaller image.");
        }
        if (response.status === 400) {
             throw new Error("Bad Request: Invalid input data.");
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Authentication methods
  async login(username: string, password: string) {
    const response = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });

    // Handle force password change scenario (403 response with requiresPasswordChange)
    if (!response.success && response.data && response.data.requiresPasswordChange) {
      // Set token for temporary session
      if (response.data.token) {
        this.setToken(response.data.token);
      }
      return {
        success: false,
        requiresPasswordChange: true,
        data: response.data,
        message: response.message
      };
    }

    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    return this.request("/auth/me");
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.request("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }

  // Product methods
  async searchProducts(
    params: {
      page?: number;
      search?: string;
      commissionRate?: number;
      ratingStar?: number;
      sortBy?: string;
      sortOrder?: string;
    } = {}
  ) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.search) queryParams.append("search", params.search);
    if (params.commissionRate) queryParams.append("commissionRate", params.commissionRate.toString());
    if (params.ratingStar) queryParams.append("ratingStar", params.ratingStar.toString());
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.sortOrder) queryParams.append("sortOrder", params.sortOrder);

    return this.request(`/products/search?${queryParams.toString()}`);
  }

  async checkProduct(data: { itemId: string } | any) {
    return this.request("/products/check", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async saveProduct(productData: any) {
    return this.request("/products/save", {
      method: "POST",
      body: JSON.stringify(productData)
    });
  }

  async getSavedProducts(
    params: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      categoryId?: number;
      tagId?: number;
      sortBy?: string;
      sortOrder?: string;
    } = {}
  ) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.status) queryParams.append("status", params.status);
    if (params.search) queryParams.append("search", params.search);
    if (params.categoryId) queryParams.append("category_id", params.categoryId.toString());
    if (params.tagId) queryParams.append("tag_id", params.tagId.toString());
    if (params.sortBy) queryParams.append("sort_by", params.sortBy);
    if (params.sortOrder) queryParams.append("sort_order", params.sortOrder);

    return this.request(`/products/saved?${queryParams.toString()}`);
  }

  // Helper method to support direct query string passing (used by ManageProducts)
  async fetchSavedProducts(queryString: string) {
    return this.request(`/products/saved?${queryString}`);
  }

  async syncSingleProduct(itemId: string, searchName: string) {
    return this.request(`/products/sync-single`, {
      method: "POST",
      body: JSON.stringify({ itemId, searchName })
    });
  }

  async updateProductStatus(id: string, status: string) {
    return this.request(`/products/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, {
      method: "DELETE"
    });
  }

  async deleteProductByItemId(itemId: string) {
    return this.request("/products/delete", {
      method: "DELETE",
      body: JSON.stringify({ itemId })
    });
  }

  async updateProductStatusByItemId(itemId: string, status: string) {
    return this.request("/products/status", {
      method: "PATCH",
      body: JSON.stringify({ itemId, status })
    });
  }

  async updateProductFlashSale(itemId: string, isFlashSale: boolean) {
    return this.request(`/products/${itemId}/flash-sale`, {
      method: "PATCH",
      body: JSON.stringify({ isFlashSale })
    });
  }

  // Category methods
  async getCategories() {
    return this.request("/categories");
  }

  async createCategory(name: string) {
    return this.request("/categories", {
      method: "POST",
      body: JSON.stringify({ name })
    });
  }

  async updateCategory(id: number, name: string) {
    return this.request(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name })
    });
  }

  async updateCategoryStatus(id: number, is_active: boolean) {
    return this.request(`/categories/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active })
    });
  }

  async deleteCategory(id: number) {
    return this.request(`/categories/${id}`, {
      method: "DELETE"
    });
  }

  async getCategoryProducts(id: number) {
    return this.request(`/categories/${id}/products`);
  }

  async getUnassignedProducts() {
    return this.request("/categories/products/unassigned");
  }

  async assignProductsToCategory(categoryId: number, productIds: string[]) {
    return this.request(`/categories/${categoryId}/assign`, {
      method: "POST",
      body: JSON.stringify({ productIds })
    });
  }

  async unassignProducts(productIds: string[]) {
    return this.request(`/categories/unassign`, {
      method: "POST",
      body: JSON.stringify({ productIds })
    });
  }

  async removeProductFromCategory(categoryId: number, itemId: string) {
      return this.request(`/categories/${categoryId}/remove-product`, {
        method: "POST",
        body: JSON.stringify({ itemId })
      });
  }

  // Category Keywords methods
  async getCategoryKeywords(categoryId?: number, search?: string) {
    const params = new URLSearchParams();
    if (categoryId && categoryId !== 0) params.append("category_id", categoryId.toString());
    if (search) params.append("search", search);
    return this.request(`/category-keywords?${params.toString()}`);
  }

  async getKeywordsByCategory(categoryId: number) {
    return this.request(`/category-keywords/category/${categoryId}`);
  }

  async createCategoryKeyword(data: { category_id: number; keyword: string; is_high_priority?: boolean }) {
    return this.request("/category-keywords", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async updateCategoryKeyword(id: number, data: { keyword: string; is_high_priority?: boolean }) {
    return this.request(`/category-keywords/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async deleteCategoryKeyword(id: number) {
    return this.request(`/category-keywords/${id}`, {
      method: "DELETE"
    });
  }

  async bulkCreateCategoryKeywords(categoryId: number, keywords: Array<string | { keyword: string; is_high_priority?: boolean }>) {
    return this.request("/category-keywords/bulk", {
      method: "POST",
      body: JSON.stringify({ category_id: categoryId, keywords })
    });
  }

  async moveCategoryProducts(sourceCategoryId: number, targetCategoryId: number) {
    return this.request(`/categories/${sourceCategoryId}/move-products`, {
        method: "POST",
        body: JSON.stringify({ targetCategoryId })
    });
  }

  // Tag methods
  async getTags() {
    return this.request("/tags");
  }

  async createTag(name: string) {
    return this.request("/tags", {
      method: "POST",
      body: JSON.stringify({ name })
    });
  }

  async updateTag(id: number, name: string) {
    return this.request(`/tags/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name })
    });
  }

  async updateTagStatus(id: number, is_active: boolean) {
    return this.request(`/tags/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active })
    });
  }

  async deleteTag(id: number) {
    return this.request(`/tags/${id}`, {
      method: "DELETE"
    });
  }

  async getTagProducts(id: number) {
    return this.request(`/tags/${id}/products`);
  }

  async getUnassignedTagProducts(id: number) {
    return this.request(`/tags/${id}/products/unassigned`);
  }

  async assignProductsToTag(tagId: number, productIds: string[]) {
    return this.request(`/tags/${tagId}/assign`, {
      method: "POST",
      body: JSON.stringify({ productIds })
    });
  }

  async removeProductFromTag(tagId: number, itemId: string) {
    return this.request(`/tags/${tagId}/remove-product`, {
      method: "POST",
      body: JSON.stringify({ itemId })
    });
  }
  
  async getProductTags(itemId: string) {
      return this.request(`/tags/product/${itemId}`);
  }
  
  async updateProductTags(itemId: string, tagIds: number[]) {
      return this.request(`/tags/product/${itemId}`, {
          method: "POST",
          body: JSON.stringify({ tagIds })
      });
  }

  // Banner Position methods
  async getBannerPositions() {
    return this.request("/banner-positions");
  }

  async createBannerPosition(data: any) {
    return this.request("/banner-positions", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async updateBannerPosition(id: number, data: any) {
    return this.request(`/banner-positions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async updateBannerPositionStatus(id: number, is_active: boolean) {
    return this.request(`/banner-positions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active })
    });
  }

  async deleteBannerPosition(id: number) {
    return this.request(`/banner-positions/${id}`, {
      method: "DELETE"
    });
  }

  // Banner Campaign methods
  async getBannerCampaigns() {
    return this.request("/banner-campaigns");
  }

  async createBannerCampaign(data: any) {
    return this.request("/banner-campaigns", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async updateBannerCampaign(id: number, data: any) {
    return this.request(`/banner-campaigns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async updateBannerCampaignStatus(id: number, is_active: boolean) {
    return this.request(`/banner-campaigns/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active })
    });
  }

  async deleteBannerCampaign(id: number) {
    return this.request(`/banner-campaigns/${id}`, {
      method: "DELETE"
    });
  }

  // Banner methods
  async getBanners() {
    return this.request("/banners");
  }

  async createBanner(data: any) {
    return this.request("/banners", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async updateBanner(id: number, data: any) {
    return this.request(`/banners/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async updateBannerStatus(id: number, is_active: boolean) {
    return this.request(`/banners/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active })
    });
  }

  async deleteBanner(id: number) {
    return this.request(`/banners/${id}`, {
      method: "DELETE"
    });
  }

  // Upload/Image Management methods
  async getBannerImages() {
    // Ensure token is loaded from localStorage
    if (!this.token) {
      this.token = localStorage.getItem("authToken");
    }
    return this.request("/uploads/banners");
  }

  async getAllImages() {
    // Ensure token is loaded from localStorage
    if (!this.token) {
      this.token = localStorage.getItem("authToken");
    }
    return this.request("/uploads/all");
  }

  async checkBannerImageUsage(filename: string) {
    return this.request(`/uploads/banners/${filename}/check`);
  }

  async deleteBannerImage(filename: string) {
    return this.request(`/uploads/banners/${filename}`, {
      method: "DELETE"
    });
  }

  async deleteImage(folder: string, filename: string) {
    return this.request(`/uploads/${folder}/${filename}`, {
      method: "DELETE"
    });
  }

  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append("image", file);
    const uploadUrl = `${this.baseUrl}/uploads/image`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      body: formData
    });
    return response.json();
  }

  async uploadBannerImage(file: File) {
    const formData = new FormData();
    formData.append("image", file);

    // Use proxy path (Vite proxy should handle multipart/form-data)
    const uploadUrl = `${this.baseUrl}/uploads/banner`;

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.token}`
        // Don't set Content-Type, let browser set it with boundary for multipart/form-data
      },
      body: formData
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        window.dispatchEvent(new Event('auth:expired'));
        throw new Error("Authentication required");
      }
      const errorData = await response.json().catch(() => ({ message: "Failed to upload image" }));
      throw new Error(errorData.message || "Failed to upload image");
    }

    return response.json();
  }

  // Settings methods
  async getSettings() {
    return this.request("/settings");
  }

  async updateSettings(data: any) {
    return this.request("/settings", {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  // Social Media methods
  async getSocials() {
    return this.request("/socials");
  }

  async createSocial(data: any) {
    return this.request("/socials", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async updateSocial(id: number, data: any) {
    return this.request(`/socials/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async updateSocialStatus(id: number, is_active: boolean) {
    return this.request(`/socials/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active })
    });
  }

  async deleteSocial(id: number) {
    return this.request(`/socials/${id}`, {
      method: "DELETE"
    });
  }

  // Role methods
  async getRoles() {
    return this.request("/roles");
  }

  async createRole(data: any) {
    return this.request("/roles", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  async updateRole(id: number, data: any) {
    return this.request(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  async deleteRole(id: number) {
    return this.request(`/roles/${id}`, {
      method: "DELETE"
    });
  }

  async getAllPermissions() {
    return this.request("/roles/permissions");
  }

  async getRolePermissions(roleId: number) {
    return this.request(`/roles/${roleId}/permissions`);
  }

  async updateRolePermissions(roleId: number, permissionIds: number[]) {
    return this.request(`/roles/${roleId}/permissions`, {
      method: "POST",
      body: JSON.stringify({ permissionIds })
    });
  }

  // Admin methods
  async getAdminUsers(
    params: {
      page?: number;
      limit?: number;
      search?: string;
    } = {}
  ) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.search) queryParams.append("search", params.search);

    return this.request(`/admin/users?${queryParams.toString()}`);
  }

  async createAdminUser(userData: {
    username: string;
    password: string;
    role_id: number;
    full_name?: string;
    email?: string;
    status?: string;
  }) {
    return this.request("/admin/users", {
      method: "POST",
      body: JSON.stringify(userData)
    });
  }

  async updateAdminUser(id: string, userData: any) {
    return this.request(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(userData)
    });
  }

  async updateAdminUserStatus(id: string, is_active: boolean) {
     const statusStr = is_active ? 'active' : 'inactive';
     return this.request(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: statusStr })
    });
  }

  async deleteAdminUser(id: string) {
    return this.request(`/admin/users/${id}`, {
      method: "DELETE"
    });
  }

  async getDashboardStats() {
    return this.request("/admin/stats");
  }
}

// Create singleton instance
export const apiService = new ApiService(API_BASE_URL);

// Helper functions for common operations
export const formatApiResponse = (response: any) => {
  return {
    success: response.success || false,
    data: response.data || null,
    message: response.message || "",
    error: response.error || null
  };
};

export const handleApiError = (error: any) => {
  console.error("API Error:", error);

  if (error.message === "Authentication required") {
    // Redirect handled by event listener
  }

  return {
    success: false,
    data: null,
    message: error.message || "An error occurred",
    error: error
  };
};
