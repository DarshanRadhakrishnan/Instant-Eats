import axios from 'axios';

export async function forwardRequest(
  serviceName: string,
  port: number,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  data: any = null
) {
  const url = `http://${serviceName}:${port}${path}`;

  try {
    const config: any = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      status: response.status,
      data: response.data,
    };
  } catch (error: any) {
    if (error.response) {
      return {
        status: error.response.status,
        data: error.response.data,
      };
    }

    throw error;
  }
}
