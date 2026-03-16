import 'isomorphic-fetch';

const API_HOST = process.env.API_HOST || '';

export default function api(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${API_HOST}/api/v1${path}`, options);
}
