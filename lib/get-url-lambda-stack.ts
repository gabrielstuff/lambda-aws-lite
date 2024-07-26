import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import 'dotenv/config'

export class GetUrlLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const fn = new NodejsFunction(this, 'lambda', {
      entry: 'lambda/index.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        S3_BUCKET: process.env.S3_BUCKET
      }
    })
    fn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE
    })
    new apigw.LambdaRestApi(this, 'myapi', {
      handler: fn
    })
  }
}
