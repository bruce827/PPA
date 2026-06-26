/**
 * Dashboard API PostgreSQL 测试
 * 简化版：使用现有 PostgreSQL 数据，不插入新数据
 */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../index');

describe('Dashboard API - PostgreSQL 测试', () => {
  // 直接测试现有的 Dashboard 接口
  // 使用 PostgreSQL 中的真实数据

  describe('GET /api/dashboard/overview', () => {
    it('should return overview payload with required fields', async () => {
      const response = await request(app).get('/api/dashboard/overview');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('recent_30d');
    });
  });

  describe('GET /api/dashboard/trend', () => {
    it('should return trend array', async () => {
      const response = await request(app).get('/api/dashboard/trend');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/dashboard/cost-range', () => {
    it('should return cost range buckets', async () => {
      const response = await request(app).get('/api/dashboard/cost-range');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/dashboard/keywords', () => {
    it('should return keyword list', async () => {
      const response = await request(app).get('/api/dashboard/keywords');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/dashboard/dna', () => {
    it('should return dna payload with required fields', async () => {
      const response = await request(app).get('/api/dashboard/dna');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('avg_total_cost_wan');
    });
  });

  describe('GET /api/dashboard/top-roles', () => {
    it('should return top roles array', async () => {
      const response = await request(app).get('/api/dashboard/top-roles');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/dashboard/top-risks', () => {
    it('should return top risks array', async () => {
      const response = await request(app).get('/api/dashboard/top-risks');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
