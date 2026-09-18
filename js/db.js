/* =========================================================
   BISBAM HAIRS — db.js
   Supabase data wrapper. Frontend reads from here.
   Falls back to local placeholder data if DB is empty.
   ========================================================= */

(function () {
  'use strict';

  function db() {
    if (!window.BisbamDB && window.initSupabase) {
      window.initSupabase();
    }
    return window.BisbamDB;
  }

  /* ============ GET ALL PRODUCTS ============ */
  async function getProducts() {
    const client = db();
    if (!client) return window.BISBAM_PRODUCTS || [];

    try {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase getProducts error:', error);
        return window.BISBAM_PRODUCTS || [];
      }

      if (!data || data.length === 0) {
        return window.BISBAM_PRODUCTS || [];
      }

      return data.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        category: p.category_slug,
        tags: p.tags || [],
        price: p.sale_price || p.retail_price || 0,
        retail_price: p.retail_price,
        wholesale_price: p.wholesale_price,
        sale_price: p.sale_price,
        stock: p.stock,
        availability: p.availability,
        lengths: p.lengths || [],
        textures: p.textures || [],
        colors: p.colors || [],
        densities: p.densities || [],
        lace_type: p.lace_type,
        cap_size: p.cap_size,
        images: p.images || [],
        image: (p.images && p.images[0]) || 'assets/images/products/placeholder.jpg',
        video_url: p.video_url,
        featured: p.featured,
        wholesale_available: p.wholesale_available,
        date: new Date(p.created_at).getTime()
      }));
    } catch (err) {
      console.warn('getProducts exception:', err);
      return window.BISBAM_PRODUCTS || [];
    }
  }

  /* ============ GET FEATURED PRODUCTS ============ */
  async function getFeaturedProducts(limit = 4) {
    const all = await getProducts();
    const featured = all.filter(p => p.featured === true);
    return (featured.length ? featured : all).slice(0, limit);
  }

  /* ============ GET SINGLE PRODUCT ============ */
  async function getProduct(idOrSlug) {
    const client = db();
    if (!client) return null;

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

      const { data, error } = await client
        .from('products')
        .select('*')
        .eq(isUuid ? 'id' : 'slug', idOrSlug)
        .single();

      if (error || !data) {
        console.warn('getProduct error:', error);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        category: data.category_slug,
        tags: data.tags || [],
        price: data.sale_price || data.retail_price || 0,
        retail_price: data.retail_price,
        wholesale_price: data.wholesale_price,
        sale_price: data.sale_price,
        stock: data.stock,
        availability: data.availability,
        lengths: data.lengths || [],
        textures: data.textures || [],
        colors: data.colors || [],
        densities: data.densities || [],
        lace_type: data.lace_type,
        cap_size: data.cap_size,
        images: data.images || [],
        image: (data.images && data.images[0]) || 'assets/images/products/placeholder.jpg',
        video_url: data.video_url,
        featured: data.featured,
        wholesale_available: data.wholesale_available
      };
    } catch (err) {
      console.warn('getProduct exception:', err);
      return null;
    }
  }

  /* ============ GET CATEGORIES ============ */
  async function getCategories() {
    const client = db();
    if (!client) return window.BISBAM_CATEGORIES || [];

    try {
      const { data, error } = await client
        .from('categories')
        .select('*')
        .order('name');

      if (error || !data || data.length === 0) {
        return window.BISBAM_CATEGORIES || [];
      }

      return data;
    } catch (err) {
      return window.BISBAM_CATEGORIES || [];
    }
  }

  /* ============ EXPOSE ============ */
  window.BisbamDB2 = {
    getProducts,
    getFeaturedProducts,
    getProduct,
    getCategories
  };

})();