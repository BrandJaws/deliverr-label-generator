import {
  Card,
  Page,
  Layout,
  TextContainer,
  Image,
  Stack,
  Link,
  Heading,
  Form,
  FormLayout,
  Checkbox,
  TextField,
  Button,
  Spinner
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { getSessionToken, authenticatedFetch } from "@shopify/app-bridge-utils";

import { useState, useCallback } from "react";

import { trophyImage } from "../assets";

import { ProductsCard } from "../components";
import { json } from "react-router-dom";

export default function HomePage() {
  const app = useAppBridge();
  const [value, setValue] = useState("30");
  const [isResult, setIsResult] = useState(false);
  const [authenticatedCode, setAuthencatedCode] = useState("");
  const [isResponseOk, setResponseOk] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [responseText, setResponseText] = useState("");
  
  const handleChange = useCallback((newValue) => setValue(newValue), []);

  const handleSubmit = useCallback((_event) => {
    window.open(
      "https://api.deliverr.com/oauth/v1/authorize?scopes=api/parcel-integration&redirect_uri=https://culturefly.myshopify.com/admin/apps/deliverr-custom-app",
      "_blank"
    );
  }, []);

  const spinFunction = () => {
    return <Spinner accessibilityLabel="Spinner example" size="large" />;
  }

  window.onload = async function () {
    let urlString = window.location.search;
    const urlParams = new URLSearchParams(urlString);
    let code = urlParams.get("code");
    // console.log(code);

    if (code != null) {
      setAuthencatedCode(code);
      setIsResult(true);
    } else {
      // console.log("code is null");
      setAuthencatedCode("");
      setIsResult(false);
    }
  };
  
  async function getFinalResponse(token, access_token, value){
    // console.log("Dummy Function called", token);
    const responseDummy = await fetch('/api/labelgenerator', {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
       },
      body: JSON.stringify({'access_token':access_token, 'value':value})
    });
    // console.log(responseDummy);
    const data = await responseDummy.text();
    console.log(data);
    if(data){
      setResponseOk(true);
      setIsResult(false);
      setResponseText(data);
      setIsLoading(false);
    }
    else
    {
       setResponseOk(false); 
    }
  }
  const handleApi = async function () {
    setIsResult(false);
    const token = await getSessionToken(app);

    setIsLoading(true)
    // console.log("API CODE IS HERE: ", authenticatedCode, window.Shopify);
    const token_response = await fetch(
      "https://api.deliverr.com/oauth/v1/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "code=" + authenticatedCode + "&grant_type=authorization_code",
      }
    );

    const token_accessCode = await token_response.json();
    // console.log(token_accessCode.access_token);
    if (token_accessCode != null){
      getFinalResponse(token , token_accessCode.access_token, value);
    }
    
    
  };
  return (
    <Page narrowWidth>
      <TitleBar title="Deliverr Label Generator" primaryAction={null} />
      <Layout>
        <Layout.Section>
          {isResult ? (
            <Form onSubmit={handleApi}>
              <FormLayout>
                <TextField
                  type="number"
                  label="Number of Order Count"
                  autoComplete="off"
                  value={value}
                  onChange={handleChange}
                ></TextField>
                <Button submit onClick={spinFunction}>Submit</Button>
              </FormLayout>
            </Form>
          ) : !isResponseOk && !isLoading && (
            <Button onClick={handleSubmit}>Generate Labels</Button>
          ) }
          {isResponseOk && <p>{responseText}</p>}
          {isLoading && (
            <div>
              <h1>Loading...</h1>
              <Spinner accessibilityLabel="Spinner example" size="large" />
            </div>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
