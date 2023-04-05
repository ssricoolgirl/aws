import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
interface MyStackProps extends cdk.StackProps {
    bucketName: string;
    roleName: string;
    policyName: string;
  }
  
  export class s3sslstack extends cdk.Stack {
  constructor(scope: Construct, id: string, props:MyStackProps) {
    super(scope, id, props);

    const roleName = props.roleName;
    const appBoundary =iam.ManagedPolicy.fromManagedPolicyName(this, 'PermissionBoundary', `appboundary-default-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`);

    //create s3 bucket
    const bucket = new s3.Bucket(this, props.bucketName, {
        bucketName: props.bucketName,
      });

    // Create the IAM role
    const role = new iam.Role(this, props.roleName, {
      permissionsBoundary: appBoundary,//only role we have 
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      roleName: roleName,
    });

    // Create the policy that requires SSL encryption for requests to the S3 bucket
    const policy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ["s3:*"],
          resources: [bucket.bucketArn + "/*"],
          conditions: {
            Bool: {
              "aws:SecureTransport": "false",
            },
          },
        }),
      ],
    });
// Attach the policy to the IAM role
    role.attachInlinePolicy(
      new iam.Policy(this, "MyPolicy", {
        policyName: props.policyName,
        document: policy,
      })
    );
  }
}