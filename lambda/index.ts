import 'dotenv/config' // Load environment variables from .env file
import { Hono } from 'hono'
import type { Context } from 'hono'
import { handle } from 'hono/aws-lambda'
import awsLite from '@aws-lite/client'
import awsLiteS3 from '@aws-lite/s3'
import type { AwsLiteClient } from '@aws-lite/client'

const config = {
  AWS_ENDPOINT: process.env.AWS_ENDPOINT,
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET
}

let aws: AwsLiteClient

async function initializeAwsLite() {
  if (!aws) {
    aws = await awsLite({
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      endpoint: config.AWS_ENDPOINT,
      region: config.AWS_REGION,
      plugins: [awsLiteS3]
    })
  }
}

const app = new Hono()

// Function to generate a pre-signed URL
async function generatePresignedUrl(key, expires = 3600) {
  await initializeAwsLite()
  try {
    const url = await aws.s3.GetSignedUrl({
      Bucket: config.S3_BUCKET,
      Key: key,
      Expires: expires
    })
    return url
  } catch (error) {
    console.error(error)
    throw new Error('Failed to generate URL')
  }
}

// Function to handle request and generate URL
async function handleGenerateUrl(c: Context) {
  let key
  let expires = 3600
  let redirect = false

  if (c.req.method === 'GET') {
    key = c.req.query('key')
    expires = Number(c.req.query('expires')) || 3600
    redirect = c.req.query('redirect') === 'true'
  } else if (c.req.method === 'POST') {
    try {
      const body = await c.req.json()
      key = body.key
      expires = Number(body.expires) || 3600
      redirect = body.redirect === true
    } catch (error) {
      return c.json({ error: 'Invalid JSON payload' }, 400)
    }
  }

  if (!key) {
    return c.json({ error: 'Missing key' }, 400)
  }

  try {
    const url = await generatePresignedUrl(key, expires)
    if (redirect) {
      return c.redirect(url)
    } else {
      return c.json({ url })
    }
  } catch (error) {
    return c.json({ error: 'Failed to generate URL' }, 500)
  }
}

app.get('/', (c: Context) =>
  c.text(`Hello from Hono Lambda! ${config.S3_BUCKET}}`)
)
app.get('/generate-url', handleGenerateUrl)
app.post('/generate-url', handleGenerateUrl)

export const handler = handle(app)
