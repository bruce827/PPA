/* eslint-disable */

declare namespace API {
  /** 角色配置 */
  type RoleConfig = {
    id: number;
    role_name: string;
    unit_price: number;
    created_at?: string;
    updated_at?: string;
  };

  /** 风险项配置 */
  type RiskItemConfig = {
    id: number;
    item_name: string;
    item_description?: string;
    max_score: number;
    created_at?: string;
    updated_at?: string;
  };

  /** 差旅成本配置 */
  type TravelCostConfig = {
    id: number;
    destination: string;
    transport_cost?: number;
    accommodation_cost?: number;
    daily_allowance?: number;
    created_at?: string;
    updated_at?: string;
  };

  /** 角色配置列表响应 */
  type RoleListResponse = {
    data: RoleConfig[];
    success: boolean;
  };

  /** 风险项配置列表响应 */
  type RiskItemListResponse = {
    data: RiskItemConfig[];
    success: boolean;
  };

  /** 差旅成本配置列表响应 */
  type TravelCostListResponse = {
    data: TravelCostConfig[];
    success: boolean;
  };

  /** 创建/更新角色参数 */
  type RoleParams = {
    role_name: string;
    unit_price: number;
  };

  /** 创建/更新风险项参数 */
  type RiskItemParams = {
    item_name: string;
    item_description?: string;
    max_score: number;
  };

  /** 创建/更新差旅成本参数 */
  type TravelCostParams = {
    destination: string;
    transport_cost?: number;
    accommodation_cost?: number;
    daily_allowance?: number;
  };
}
