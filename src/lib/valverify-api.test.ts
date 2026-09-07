import handler from '../../api/valverify.mjs'

function responseMock() {
  const headers = new Map<string, string>()
  return {
    headers,
    statusCode: 200,
    body: '',
    setHeader(name: string, value: string) {
      headers.set(name, value)
    },
    end(value: string) {
      this.body = value
    },
  }
}

describe('ValVerify API boundary', () => {
  it('rejects requests without a bearer token', async () => {
    const response = responseMock()
    await handler({ method: 'POST', headers: {}, body: { listingId: '11111111-1111-4111-8111-111111111111' } }, response)

    expect(response.statusCode).toBe(401)
    expect(JSON.parse(response.body).error.code).toBe('UNAUTHENTICATED')
  })

  it('rejects unsupported methods before reading or using credentials', async () => {
    const response = responseMock()
    await handler({ method: 'GET', headers: {}, body: null }, response)

    expect(response.statusCode).toBe(405)
    expect(response.headers.get('Allow')).toBe('POST')
  })

  it('rejects malformed listing IDs at the request boundary', async () => {
    const response = responseMock()
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer test-token' },
      body: { listingId: 'not-a-uuid' },
    }, response)

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body).error.code).toBe('INVALID_LISTING_ID')
  })

  it('does not accept a browser-supplied run identifier', async () => {
    const response = responseMock()
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer test-token' },
      body: {
        listingId: '11111111-1111-4111-8111-111111111111',
        run_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    }, response)

    expect(response.statusCode).toBe(400)
    expect(JSON.parse(response.body).error.code).toBe('INVALID_LISTING_ID')
  })
})
