import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface MyStackProps extends cdk.StackProps {
  bucketName: string;
  roleName: string;
  prefix: string;
  policyName: string;

}

export class S3FullReadAccessPermissions extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, props);
    //add it to the role
    const appBoundary =iam.ManagedPolicy.fromManagedPolicyName(this, 'PermissionBoundary', `appboundary-default-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`);

    // Create the S3 bucket
    const bucket = new s3.Bucket(this, "MyBucket", {
      bucketName: props.bucketName,
    });
     //add the permissions to existing roles.
    // Create the IAM role that will be granted read and write access to objects with the prefix
    const readWriteRole = new iam.Role(this, props.roleName, {
      permissionsBoundary: appBoundary,//only role we have
      assumedBy: new iam.AccountPrincipal(cdk.Aws.ACCOUNT_ID),
      roleName: props.roleName,//should start with "app-"
     
    });

    bucket.grantReadWrite(readWriteRole, props.prefix + "/*");
    // Create the IAM managed policy that denies access to objects without the specified prefix
    const policy = new iam.ManagedPolicy(this, props.policyName, {
      managedPolicyName: props.policyName,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ["s3:*"],
          resources: [bucket.bucketArn + "/*"],
          conditions: {
            StringNotLike: {
              "s3:prefix": props.prefix + "/*",
            },
          },
        }),
      ],
    });

    //attach
    readWriteRole.addManagedPolicy(policy);
  }
}



















































