//notifications
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as iam from "aws-cdk-lib/aws-iam";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";

interface MyStackProps extends cdk.StackProps {
  bucketName: string;
  roleName: string;
  policyName: string;
  alertTopic: string;
}

export class S3SecurityMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    
    super(scope, id, props);
    const appBoundary =iam.ManagedPolicy.fromManagedPolicyName(this, 'PermissionBoundary', `appboundary-default-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`);

    // Create an S3 bucket with server access logging enabled
    const bucket = new s3.Bucket(this, props.bucketName, {
      serverAccessLogsPrefix: "access-logs/",
    });

    const readWriteRole = new iam.Role(this, props.roleName, {
      permissionsBoundary: appBoundary,//only role we have
      assumedBy: new iam.AccountPrincipal(cdk.Aws.ACCOUNT_ID),
      roleName: props.roleName,//should start with "app-"
     
    });

    // Create an SNS topic for security alerts
    const securityAlertsTopic = new sns.Topic(this, props.alertTopic);

  //  // Create a Lambda function to handle security
  //   const service_quota_func = new NodejsFunction(this, 'serviceQuotaHandler', {
  //     entry: 'lambda/service_quota.ts',
  //     runtime: Runtime.NODEJS_16_X,
  //     functionName: 'service_quota',
  //     timeout: Duration.seconds(120),
  // }
  // );

    const securityEventHandler = new lambda.Function(
        this,
        "SecurityEventHandler",
        {
          runtime: lambda.Runtime.NODEJS_14_X,
          code: lambda.Code.fromAsset("lambda"),
          handler: "index.handler",
        }
      );
  
      // Grant the Lambda function permissions to access the bucket and the SNS topic
      const handlerPolicy = new iam.PolicyStatement({
        actions: ["s3:GetObject", "sns:Publish"],
        resources: [bucket.bucketArn, `${securityAlertsTopic.topicArn}*`],
      });
      securityEventHandler.addToRolePolicy(handlerPolicy);
  
      // Create an S3 event notification to trigger the Lambda function when an object is retrieved externally
      const eventFilter = {
        suffix: ".txt",
      };
      bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3n.LambdaDestination(securityEventHandler),
        eventFilter
      );
  
      // Create a subscription to the SNS topic to receive security alerts
      securityAlertsTopic.addSubscription(
        new EmailSubscription("your@ccompany.com")
    );
  }
}