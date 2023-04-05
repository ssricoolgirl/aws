import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface MyStackProps extends cdk.StackProps {
  bucketName: string;
  roleName: string;
  policyName: string;
}

export class MyPolicyS3Read extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, props);

    // Create the S3 bucket
    const bucket = new s3.Bucket(this, props.bucketName, {
      bucketName: props.bucketName,
    });

    // S3 bucket
    //const bucket = s3.Bucket.fromBucketName(this, "MyBucket", props.bucketName);

    // Create the IAM role
    const role = new iam.Role(this, props.roleName, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: props.roleName,
    });

    // Create the policy statement to allow the role to read objects from the S3 bucket
    const myPolicy = new iam.Policy(this, props.policyName, {
      policyName: props.policyName,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["s3:GetObject"],
          resources: [`${bucket.bucketArn}`],
        }),
      ],
    });

    // Add the policy statement to the role's policy
    role.attachInlinePolicy(myPolicy);

    // Export the CloudFormation stack output to make it accessible to other stacks
    new cdk.CfnOutput(this, "MyBucketName", {
      value: bucket.bucketName,
    });
  }
}