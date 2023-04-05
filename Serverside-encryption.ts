//we're creating an S3 bucket and applying a bucket policy that denies all actions on objects in the bucket if the request does not use Server-Side Encryption 
//with Amazon S3-managed keys. Note that we're using the s3:* action to deny all actions on objects in the bucket, and the condition 
//'StringNotEquals': {'s3:x-amz-server-side-encryption': 'AES256'} to require that the request includes Server-Side Encryption with Amazon S3-managed keys.
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface MyStackProps extends cdk.StackProps {
  bucketName: string;
  roleName: string;
  policyName: string;
  stackName: string;
}

export class ServerSideEncryption extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, props);

    // Create the S3 bucket
    const bucket = new s3.Bucket(this,props.bucketName, {
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Create the bucket policy that requires requests to use Server-Side Encryption with Amazon S3-managed keys
    const policy = new s3.BucketPolicy(this, props.policyName, {
      bucket: bucket,
    });
    policy.document.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ["s3:*"],
        principals: [new iam.AnyPrincipal()],
        resources: [bucket.bucketArn + "/*"],
        conditions: {
            StringNotEquals: {
              "s3:x-amz-server-side-encryption": "AES256",
            },
          },
        })
      );
    }
  }