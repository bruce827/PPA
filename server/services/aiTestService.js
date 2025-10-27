/**
 * AI 连接测试服务
 * 支持测试不同服务商的 AI 模型连接
 */

const https = require('https');
const http = require('http');

/**
 * 通用 HTTP/HTTPS 请求函数
 */
function makeRequest(options, postData = null, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const startTime = Date.now();
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            data: jsonData,
            duration,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data,
            duration,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`网络错误: ${error.message}`));
    });
    
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error(`请求超时 (${timeout}ms)`));
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

/**
 * 测试 OpenAI 连接
 */
async function testOpenAI(config) {
  const url = new URL('/v1/chat/completions', config.api_host);
  
  const postData = JSON.stringify({
    model: config.model_name,
    messages: [{ role: 'user', content: 'Hi' }],
    max_tokens: 5
  });
  
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    protocol: url.protocol,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${config.api_key}`
    }
  };
  
  try {
    const response = await makeRequest(options, postData, config.timeout * 1000);
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      return {
        success: true,
        message: `连接成功！模型 ${config.model_name} 响应正常`,
        duration: response.duration,
        details: {
          statusCode: response.statusCode,
          model: config.model_name
        }
      };
    } else if (response.statusCode === 401) {
      return {
        success: false,
        message: 'API Key 无效或已过期',
        duration: response.duration,
        error: 'Authentication failed'
      };
    } else if (response.statusCode === 429) {
      return {
        success: false,
        message: '请求频率过高，已达到速率限制',
        duration: response.duration,
        error: 'Rate limit exceeded'
      };
    } else {
      return {
        success: false,
        message: `请求失败 (HTTP ${response.statusCode})`,
        duration: response.duration,
        error: response.data.error?.message || '未知错误'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      duration: 0,
      error: error.message
    };
  }
}

/**
 * 测试 Azure OpenAI 连接
 */
async function testAzureOpenAI(config) {
  // Azure OpenAI endpoint 格式:
  // https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version=2023-05-15
  
  const url = new URL(config.api_host);
  const path = url.pathname.endsWith('/') 
    ? `${url.pathname}openai/deployments/${config.model_name}/chat/completions?api-version=2023-05-15`
    : `${url.pathname}/openai/deployments/${config.model_name}/chat/completions?api-version=2023-05-15`;
  
  const postData = JSON.stringify({
    messages: [{ role: 'user', content: 'Hi' }],
    max_tokens: 5
  });
  
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: path,
    method: 'POST',
    protocol: url.protocol,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'api-key': config.api_key
    }
  };
  
  try {
    const response = await makeRequest(options, postData, config.timeout * 1000);
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      return {
        success: true,
        message: `Azure OpenAI 连接成功！部署 ${config.model_name} 响应正常`,
        duration: response.duration,
        details: {
          statusCode: response.statusCode,
          deployment: config.model_name
        }
      };
    } else if (response.statusCode === 401 || response.statusCode === 403) {
      return {
        success: false,
        message: 'API Key 无效或权限不足',
        duration: response.duration,
        error: 'Authentication failed'
      };
    } else {
      return {
        success: false,
        message: `请求失败 (HTTP ${response.statusCode})`,
        duration: response.duration,
        error: response.data.error?.message || '未知错误'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      duration: 0,
      error: error.message
    };
  }
}

/**
 * 测试阿里云通义千问连接
 */
async function testAliyunQwen(config) {
  // 阿里云通义千问 API endpoint
  const url = new URL('/v1/services/aigc/text-generation/generation', config.api_host);
  
  const postData = JSON.stringify({
    model: config.model_name,
    input: {
      messages: [{ role: 'user', content: 'Hi' }]
    },
    parameters: {
      max_tokens: 5
    }
  });
  
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    protocol: url.protocol,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${config.api_key}`
    }
  };
  
  try {
    const response = await makeRequest(options, postData, config.timeout * 1000);
    
    if (response.statusCode === 200) {
      return {
        success: true,
        message: `阿里云通义千问连接成功！模型 ${config.model_name} 响应正常`,
        duration: response.duration,
        details: {
          statusCode: response.statusCode,
          model: config.model_name
        }
      };
    } else if (response.statusCode === 401) {
      return {
        success: false,
        message: 'API Key 无效',
        duration: response.duration,
        error: 'Authentication failed'
      };
    } else {
      return {
        success: false,
        message: `请求失败 (HTTP ${response.statusCode})`,
        duration: response.duration,
        error: response.data.message || '未知错误'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      duration: 0,
      error: error.message
    };
  }
}

/**
 * 测试百度文心一言连接
 */
async function testBaiduErnie(config) {
  // 百度文心一言 API endpoint
  const url = new URL(`/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${config.model_name}?access_token=${config.api_key}`, config.api_host);
  
  const postData = JSON.stringify({
    messages: [{ role: 'user', content: 'Hi' }],
    max_output_tokens: 5
  });
  
  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: 'POST',
    protocol: url.protocol,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  try {
    const response = await makeRequest(options, postData, config.timeout * 1000);
    
    if (response.statusCode === 200 && response.data.error_code === undefined) {
      return {
        success: true,
        message: `百度文心一言连接成功！模型 ${config.model_name} 响应正常`,
        duration: response.duration,
        details: {
          statusCode: response.statusCode,
          model: config.model_name
        }
      };
    } else if (response.data.error_code) {
      return {
        success: false,
        message: `API 错误: ${response.data.error_msg || '未知错误'}`,
        duration: response.duration,
        error: response.data.error_msg
      };
    } else {
      return {
        success: false,
        message: `请求失败 (HTTP ${response.statusCode})`,
        duration: response.duration,
        error: '未知错误'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      duration: 0,
      error: error.message
    };
  }
}

/**
 * 通用 HTTP 测试（用于其他服务商）
 */
async function testGenericHTTP(config) {
  const url = new URL(config.api_host);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'GET',
    protocol: url.protocol,
    headers: {
      'User-Agent': 'PPA-Test-Client/1.0'
    }
  };
  
  try {
    const response = await makeRequest(options, null, config.timeout * 1000);
    
    if (response.statusCode >= 200 && response.statusCode < 500) {
      return {
        success: true,
        message: `连接成功！服务器响应正常 (HTTP ${response.statusCode})`,
        duration: response.duration,
        details: {
          statusCode: response.statusCode,
          host: config.api_host
        }
      };
    } else {
      return {
        success: false,
        message: `服务器错误 (HTTP ${response.statusCode})`,
        duration: response.duration,
        error: `HTTP ${response.statusCode}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      duration: 0,
      error: error.message
    };
  }
}

/**
 * 主测试函数：根据服务商类型选择测试策略
 */
async function testConnection(config) {
  const startTime = Date.now();
  
  try {
    // 验证配置
    if (!config.provider || !config.api_host || !config.api_key) {
      return {
        success: false,
        message: '配置信息不完整，请检查 provider、api_host 和 api_key',
        duration: Date.now() - startTime,
        error: 'Invalid configuration'
      };
    }
    
    // 根据服务商选择测试策略
    let result;
    switch (config.provider.toLowerCase()) {
      case 'openai':
        result = await testOpenAI(config);
        break;
      
      case 'azure openai':
      case 'azure':
        result = await testAzureOpenAI(config);
        break;
      
      case '阿里云':
      case 'aliyun':
      case 'qwen':
        result = await testAliyunQwen(config);
        break;
      
      case '百度':
      case 'baidu':
      case 'ernie':
        result = await testBaiduErnie(config);
        break;
      
      default:
        result = await testGenericHTTP(config);
        break;
    }
    
    return result;
    
  } catch (error) {
    return {
      success: false,
      message: `测试失败: ${error.message}`,
      duration: Date.now() - startTime,
      error: error.message
    };
  }
}

module.exports = {
  testConnection,
  testOpenAI,
  testAzureOpenAI,
  testAliyunQwen,
  testBaiduErnie,
  testGenericHTTP
};
