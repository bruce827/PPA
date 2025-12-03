/* eslint-disable */

declare namespace API {
  /** 项目信息 */
  type ProjectInfo = {
    id: number;
    name: string;
    description?: string;
    is_template?: number | boolean;
    final_total_cost: number;
    final_risk_score: number;
    final_workload_days?: number;
    created_at?: string;
    updated_at?: string;
    // 详细数据字段
    project_data?: any;
  };

  /** 项目列表响应 */
  type ProjectListResponse = {
    data: ProjectInfo[];
    success: boolean;
  };

  /** 项目详情响应 */
  type ProjectDetailResponse = {
    data: ProjectInfo;
    success: boolean;
  };

  /** 删除项目响应 */
  type DeleteProjectResponse = {
    success: boolean;
  };
}
